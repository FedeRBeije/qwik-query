import { $, component$ } from '@builder.io/qwik';
import { Link, routeLoader$ } from '@builder.io/qwik-city';
import { QueryClient } from '@tanstack/query-core';
import { useQuery, useIsFetching, useMutation } from '~/qwik-query';
import { createQueryClient } from '~/qwik-query/useQueryClient';
import { queryClientState } from '~/qwik-query/utils';

export const queryFuntion = $(async (): Promise<Array<any>> => {
	const response = await fetch(
		'https://jsonplaceholder.typicode.com/' +
			(Math.random() > 0.5 ? 'users' : 'posts'),
		{
			method: 'GET',
		}
	);
	return response.json();
});

const queryKey = ['post'];

export const useRouteLoader = routeLoader$(async () => {
	const queryClient = new QueryClient();
	await queryClient.prefetchQuery({
		queryKey,
		queryFn: $(async (): Promise<Array<any>> => {
			const response = await fetch(
				'https://jsonplaceholder.typicode.com/users',
				{
					method: 'GET',
				}
			);
			return response.json();
		}),
	});
	return queryClientState(queryClient);
});

export default component$(() => {
	const queryStore = useQuery(
		{ queryKey, queryFn: queryFuntion, refetchInterval: 1000 },
		useRouteLoader().value
	);
	const isFetchingSig = useIsFetching();
	const mutationStore = useMutation({
		mutationFn: $(() => fetch(`/api/data?clear=1`)),
		onSuccess: $(() => {
			const queryClient = createQueryClient();
			queryClient.invalidateQueries({ queryKey: ['posts'] });
		}),
		onError: $(() => {
			console.log('-----error----');
			const queryClient = createQueryClient();
			queryClient.invalidateQueries({ queryKey: ['posts'] });
		}),
	});
	return (
		<div>
			<button
				onClick$={() => {
					queryStore.options = { ...queryStore.options, refetchInterval: 5000 };
				}}
			>
				change refetchInterval
			</button>
			<button
				onClick$={() => {
					mutationStore.options = {
						...mutationStore.options,
						onError: $(() => {}),
					};
					mutationStore.mutate('', {
						onSuccess: () => {
							console.log('mutationStore.mutate');
						},
					});
				}}
			>
				mutation
			</button>
			<br></br>
			isFetch: {isFetchingSig.value}
			<br></br>
			Status: {queryStore.result?.status} <br></br>
			Lenght: {queryStore.result?.data.length} <br></br>
			<Link href='/infinity'>infinity</Link>
		</div>
	);
});
