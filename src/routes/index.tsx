import { $, component$ } from "@builder.io/qwik";
import { Link, routeLoader$ } from "@builder.io/qwik-city";
import { QueryClient } from "@tanstack/query-core";
import { useQuery, useIsFetching, useMutation } from "~/qwik-query";
import { createQueryClient } from "~/qwik-query/useQueryClient";
import { queryClientState } from "~/qwik-query/utils";

export const queryFunction = $(async (): Promise<Array<any>> => {
  const response = await fetch(
    "https://jsonplaceholder.typicode.com/" +
      (Math.random() > 0.5 ? "users" : "posts"),
    {
      method: "GET",
    },
  );
  return response.json();
});

const queryKey = ["post"] as const;

export const useRouteLoader = routeLoader$(async () => {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey,
    queryFn: $(async (): Promise<Array<any>> => {
      const response = await fetch(
        "https://jsonplaceholder.typicode.com/users",
        {
          method: "GET",
        },
      );
      return response.json();
    }),
  });
  return queryClientState(queryClient);
});

export default component$(() => {
  const queryStore = useQuery(
    {
      queryKey,
      queryFn: queryFunction,
    },
    useRouteLoader().value,
  );

  const isFetchingSig = useIsFetching();
  const mutationStore = useMutation({
    mutationFn: $(() => fetch(`/api/data?clear=1`)),
    onSuccess: $(() => {
      const queryClient = createQueryClient();
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    }),
    onError: $(() => {
      console.log("-----error----");
      const queryClient = createQueryClient();
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    }),
  });
  return (
    <div>
      <button onClick$={$(() => queryStore.refetch())}>refetch</button>
      <button
        onClick$={() => {
          mutationStore.options = {
            ...mutationStore.options,
            onError: $(() => {}),
          };
          mutationStore.mutate("", {
            onSuccess: () => {
              console.log("mutationStore.mutate");
            },
          });
        }}
      >
        mutation
      </button>
      <br></br>
      isFetch: {isFetchingSig.value}
      <br></br>
      Status: {queryStore.status} <br></br>
      Lenght: {queryStore.data?.length} <br></br>
      {Object.entries(queryStore).map(([key, value]) => (
        <div key={key}>
          {typeof value === "function" ? (
            <></>
          ) : (
            <div style={{ margin: 10 }}>
              <div
                style={{
                  fontSize: 20,
                  display: "flex",
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <p>{key}: </p> {JSON.stringify(value, null, 2)}
              </div>
            </div>
          )}
        </div>
      ))}
      <Link href="/infinity">infinity</Link>
    </div>
  );
});
