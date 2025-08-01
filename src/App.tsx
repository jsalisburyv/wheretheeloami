import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ProtectedRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </ProtectedRoute>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
