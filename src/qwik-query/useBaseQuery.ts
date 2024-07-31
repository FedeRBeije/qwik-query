import {
  noSerialize,
  useSignal,
  useStore,
  useVisibleTask$,
  type NoSerialize,
} from "@builder.io/qwik";
import type {
  InfiniteQueryObserverResult,
  QueryKey,
  QueryObserverResult,
} from "@tanstack/query-core";
import {
  InfiniteQueryObserver,
  QueryClient,
  QueryObserver,
  hydrate,
  notifyManager,
  type DehydratedState,
} from "@tanstack/query-core";
import {
  isInfiniteQueryObserverResult,
  UseInfiniteQueryOptions,
  type QueryStore,
  type QwikUseBaseQueryOptions,
} from "./types";
import { useQueryClient } from "./QueryClientProvider";
import { createQueryClient } from "./useQueryClient";

export enum ObserverType {
  base,
  inifinite,
}

export const useBaseQuery = <
  TQueryFnData,
  TError,
  TData,
  TQueryData,
  TQueryKey extends QueryKey,
>(
  observerType: ObserverType,
  options: QwikUseBaseQueryOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryData,
    TQueryKey
  >,
  initialState?: DehydratedState,
  queryClient?: QueryClient,
):
  | QueryObserverResult<TData, TError>
  | InfiniteQueryObserverResult<TData, TError> => {
  // Check if the options are in the correct format
  if (!import.meta.env.PROD) {
    if (typeof options !== "object" || Array.isArray(options)) {
      throw new Error(
        'Bad argument type. Starting with v5, only the "Object" form is allowed when calling query related functions. Please use the error stack to find the culprit call. More info here: https://tanstack.com/query/latest/docs/react/guides/migrating-to-v5#supports-a-single-signature-one-object',
      );
    }
  }

  const client = createQueryClient(); // Get the query client from the context

  // If there is an initial state, hydrate the client
  if (initialState) {
    hydrate(client, initialState);
  }

  // Create the store
  const store = useStore<
    QueryStore<TQueryFnData, TError, TData, TQueryData, TQueryKey>
  >({
    result: initialState
      ? client.getQueryState(options.queryKey || [])
      : undefined,
    options,
  });

  // Create the observer signal
  const observerSig =
    useSignal<
      NoSerialize<
        QueryObserver<TQueryFnData, TError, TData, TQueryData, TQueryKey>
      >
    >();

  useVisibleTask$(({ cleanup }) => {
    const { observer, unsubscribe, defaultedOptions } = createQueryObserver<
      TQueryFnData,
      TError,
      TData,
      TQueryData,
      TQueryKey
    >(store, options, observerType, client);
    observerSig.value = observer;
    store.options = defaultedOptions;

    cleanup(unsubscribe);
  });

  useVisibleTask$(({ track }) => {
    track(() => store.options);
    if (observerSig.value) {
      observerSig.value.setOptions(store.options || options);
    }
  });

  //NOTE: I think that the right return value should be only the result that will contain {data, error, status etc..}
  //NOTE: As it is now in whole the other packages
  return store.result;
};

const createQueryObserver = <
  TQueryFnData,
  TError,
  TData,
  TQueryData,
  TQueryKey extends QueryKey,
>(
  store: QueryStore<TQueryFnData, TError, TData, TQueryData, TQueryKey>,
  options: QwikUseBaseQueryOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryData,
    TQueryKey
  >,
  observerType: ObserverType,
  client: QueryClient,
) => {
  // Prepare the observer based on the type. If it is infinite, use InfiniteQueryObserver
  //NOTE: Not sure if it is right to handle here the infinite case
  const Observer =
    observerType === ObserverType.base
      ? QueryObserver
      : (InfiniteQueryObserver as typeof QueryObserver);

  const defaultedOptions = client.defaultQueryOptions(options);
  defaultedOptions._optimisticResults = "optimistic";
  defaultedOptions.structuralSharing = false;

  // Create the observer
  const observer = new Observer(client, defaultedOptions);

  // If there is no result, get the optimistic result
  if (!store.result) {
    const result = observer.getOptimisticResult(defaultedOptions);
    patchAndAssignResult<TQueryFnData, TError, TData, TQueryData, TQueryKey>(
      observerType,
      store,
      result,
      defaultedOptions,
      observer,
    );
  }

  const unsubscribe = observer.subscribe(
    notifyManager.batchCalls((result: any) => {
      patchAndAssignResult<TQueryFnData, TError, TData, TQueryData, TQueryKey>(
        observerType,
        store,
        result,
        defaultedOptions,
        observer,
      );
    }),
  );

  return { observer: noSerialize(observer), unsubscribe, defaultedOptions };
};

const patchAndAssignResult = async <
  TQueryFnData,
  TError,
  TData,
  TQueryData,
  TQueryKey extends QueryKey,
>(
  observerType: ObserverType,
  store: QueryStore<TQueryFnData, TError, TData, TQueryData, TQueryKey>,
  result:
    | QueryObserverResult<TData, TError>
    | InfiniteQueryObserverResult<TData, TError>,
  defaultedOptions: QwikUseBaseQueryOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryData,
    TQueryKey
  >,
  observer:
    | QueryObserver<TQueryFnData, TError, TData, TQueryData, TQueryKey>
    | InfiniteQueryObserver<TQueryFnData, TError, TData, TQueryData, TQueryKey>,
) => {
  // If the observer is infinite, check if there are more pages
  if (
    observerType === ObserverType.inifinite &&
    isInfiniteQueryObserverResult<TData, TError>(result)
  ) {
    const infiniteOptions = store.options as UseInfiniteQueryOptions<
      TQueryFnData,
      TError,
      TData,
      TQueryData,
      TQueryKey
    >;

    result.hasPreviousPage = await hasPage(
      infiniteOptions,
      // NOTE: I think this is wrong, it should be more dynamic? we don't know the backend response
      result.data.pages,
      "PREV",
    );
    result.hasNextPage = await hasPage(
      infiniteOptions,
      result.data.pages,
      "NEXT",
    );
  }

  // Assign the result to the store
  store.result = !defaultedOptions.notifyOnChangeProps
    ? noSerialize(observer.trackResult(result))
    : noSerialize(result);
};

const hasPage = async <
  TQueryFnData,
  TError,
  TData,
  TQueryData,
  TQueryKey extends QueryKey,
>(
  options: UseInfiniteQueryOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryData,
    TQueryKey
  >,
  pages: unknown[] | undefined,
  direction: "PREV" | "NEXT",
): Promise<boolean> => {
  const getPageParam =
    direction === "PREV"
      ? options.getPreviousPageParam
      : options.getNextPageParam;
  if (getPageParam && Array.isArray(pages)) {
    //NOTE: si aspetterebbe questi parametri; lastPage: TQueryFnData, allPages: Array<TQueryFnData>, lastPageParam: TPageParam, allPageParams: Array<TPageParam>
    const pageParam = await getPageParam(
      direction === "PREV" ? pages[0] : pages[pages.length - 1],
      pages,
    );
    console.log("pageParam", pageParam, direction);
    return (
      typeof pageParam !== "undefined" &&
      pageParam !== null &&
      pageParam !== false
    );
  }
  return false;
};
