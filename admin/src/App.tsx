import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { router } from './router'
import useAdminStore from './store/useAdminStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

export function App() {
  const { theme } = useAdminStore()

  return (
    <QueryClientProvider client={queryClient}>
      <div data-theme={theme}>
        <RouterProvider router={router} />
      </div>
    </QueryClientProvider>
  )
}
