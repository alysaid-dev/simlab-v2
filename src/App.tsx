import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from "./contexts/AuthContext";
import { WaNumberOnboardModal } from "./components/WaNumberOnboardModal";

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <WaNumberOnboardModal />
    </AuthProvider>
  );
}

export default App;
