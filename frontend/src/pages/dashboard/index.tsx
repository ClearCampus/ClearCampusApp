import { Spinner } from "@heroui/react";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../lib/auth/AuthContext";

export default function () {
  const { session, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (!session) {
      navigate("/login", { replace: true });
    } else if (session.user.role === "club") {
      navigate("/dashboard/club", { replace: true });
    } else {
      navigate("/dashboard/student", { replace: true });
    }
  }, [isLoading, session, navigate]);

  return (
    <div className="w-screen h-screen flex items-center justify-center">
      <Spinner size="xl" />
    </div>
  );
}
