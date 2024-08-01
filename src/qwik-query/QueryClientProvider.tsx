/*import {
	Slot,
	component$,
	useVisibleTask$
} from '@builder.io/qwik';
import { createQueryClient } from './useQueryClient';

export default component$(() => {
	useVisibleTask$(({ cleanup }) => {
		const queryClient = createQueryClient();
		queryClient.mount();
		cleanup(() => {
			queryClient.unmount();
		});
	});
	return <Slot />;
});*/

import {
  JSX,
  NoSerialize,
  Slot,
  component$,
  createContextId,
  noSerialize,
  useContext,
  useContextProvider,
  useVisibleTask$,
} from "@builder.io/qwik";
import { isServer } from "@builder.io/qwik/build";
import { type QueryClientConfig, QueryClient } from "@tanstack/query-core";

interface QueryClientProviderProps {
  client: NoSerialize<QueryClient>;
  config?: QueryClientConfig;
}

// -- Context id
export const QUERYCLIENTCTX =
  createContextId<NoSerialize<QueryClient>>("queryClient");
export const OPTIONSCTX = createContextId<QueryClientConfig | undefined>(
  "options",
);

export const useQueryClient = (queryClient?: NoSerialize<QueryClient>) => {
  let client = useContext(QUERYCLIENTCTX); // Get the query client from the context
  const config = useContext(OPTIONSCTX);

  // If we are on the server, we should not be able to get the query client
  if (isServer) {
    throw "You can use getQueryClient only in the client side!";
  }

  // If the query client is provided, return it
  if (queryClient) {
    return queryClient;
  }

  // If the query client is not provided and the client is not set, throw an error
  if (!client) {
    client = noSerialize(new QueryClient(config)); // Create a new query client
  }

  // If the query client is not provided, return the client from the context
  return client;
};

export default component$<QueryClientProviderProps>(({ client, config }) => {
  // Provide the query client to the context under the Context ID.
  useContextProvider(QUERYCLIENTCTX, client);
  useContextProvider(OPTIONSCTX, config);

  //eslint-disable-next-line
  useVisibleTask$(({ cleanup }) => {
    client && client.mount(); // Mount the query client
    cleanup(() => {
      client && client.unmount(); // Unmount the query client if the component is removed
    });
  });

  return <Slot />;
});
