import { createBrowserRouter } from 'react-router-dom';
import MainLayout from './MainLayout';
import { ReadOnlyGrid } from './views/ReadOnlyGrid';
import { ReadOnlyGridSinglePropertyFilter } from './views/ReadOnlyGridSinglePropertyFilter';
import { ReadOnlyGridOrFilter } from './views/ReadOnlyGridOrFilter';

export const routes = [
  {
    path: '',
    element: <MainLayout />,
    children: [
      {
        path: '/readonly-grid',
        element: <ReadOnlyGrid />,
      },
      {
        path: '/readonly-grid-single-property-filter',
        element: <ReadOnlyGridSinglePropertyFilter />,
      },
      {
        path: '/readonly-grid-or-filter',
        element: <ReadOnlyGridOrFilter />,
      },
    ],
  },
];

const router = createBrowserRouter([...routes]);
export default router;