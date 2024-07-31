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
  useContext,
  useContextProvider,
  useTask$,
} from "@builder.io/qwik";
import { isServer } from "@builder.io/qwik/build";
import { type QueryClient } from "@tanstack/query-core";

interface QueryClientProviderProps {
  client: NoSerialize<QueryClient>;
}

// -- Context id
export const CTX = createContextId<QueryClient | undefined>("queryClient");

export const useQueryClient = (queryClient?: QueryClient) => {
  const client = useContext(CTX); // Get the query client from the context

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
    throw new Error("No QueryClient set, use QueryClientProvider to set one");
  }

  // If the query client is not provided, return the client from the context
  return client;
};

export default component$<QueryClientProviderProps>(
  ({ client }): JSX.Element => {
    // Provide the query client to the context under the Context ID.
    useContextProvider(CTX, client);

    //eslint-disable-next-line
    useTask$(({ cleanup }) => {
      client && client.mount(); // Mount the query client
      cleanup(() => {
        client && client.unmount(); // Unmount the query client if the component is removed
      });
    });

    return <Slot />;
  },
);
