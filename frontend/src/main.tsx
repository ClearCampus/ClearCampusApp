import { Spinner } from "@heroui/react";
import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, useRoutes } from "react-router";
import routes from "~react-pages";
import "./index.css";
import { AuthProvider } from "./lib/auth/AuthContext";
import { ClubDataProvider } from "./lib/data/ClubDataContext";
import { StudentDataProvider } from "./lib/data/StudentDataContext";

function App() {
  return (
    <Suspense
      fallback={
        <div className="w-screen h-screen flex items-center justify-center">
          <Spinner size="xl" />
        </div>
      }
    >
      {useRoutes(routes)}
    </Suspense>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ClubDataProvider>
          <StudentDataProvider>
            <App />
          </StudentDataProvider>
        </ClubDataProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
