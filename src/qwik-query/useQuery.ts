import type {
  DehydratedState,
  QueryKey,
  DefaultError,
  QueryObserverResult,
  DefinedQueryObserverResult,
} from "@tanstack/query-core";
import { ObserverType, useBaseQuery } from "./useBaseQuery";
import type {
  DefinedUseQueryResult,
  UseQueryOptions,
  UseQueryResult,
} from "./types";
import type {
  DefinedInitialDataOptions,
  UndefinedInitialDataOptions,
} from "./queryOptions";

export function useQuery<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: UndefinedInitialDataOptions<TQueryFnData, TError, TData, TQueryKey>,
  initialState?: DehydratedState,
): QueryObserverResult<TData, TError>;

export function useQuery<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: DefinedInitialDataOptions<TQueryFnData, TError, TData, TQueryKey>,
  initialState?: DehydratedState,
): DefinedQueryObserverResult<TData, TError>;

export function useQuery<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  initialState?: DehydratedState,
): QueryObserverResult<TData, TError>;

export function useQuery(
  options: UseQueryOptions,
  initialState?: DehydratedState,
) {
  return useBaseQuery(ObserverType.base, options, initialState);
}
