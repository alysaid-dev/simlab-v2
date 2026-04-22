import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from "./contexts/AuthContext";
import { WaNumberOnboardModal } from "./components/WaNumberOnboardModal";
import { DialogProvider } from "./lib/dialog";

function App() {
  return (
    <AuthProvider>
      <DialogProvider>
        <RouterProvider router={router} />
        <WaNumberOnboardModal />
      </DialogProvider>
    </AuthProvider>
  );
}

export default App;
