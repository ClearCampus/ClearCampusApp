import { Button, Link } from "@heroui/react";
import { useNavigate } from "react-router";
import { useAuth } from "../lib/auth/AuthContext";

interface NavbarProps {
  page?: "home" | "students" | "clubs" | "events";
}

export default function Navbar({ page }: NavbarProps) {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const dashboardHref = session?.user.role === "club" ? "/dashboard/club" : "/dashboard/student";

  return (
    <div className="fixed top-0 left-0 w-full flex flex-row p-4 z-50 justify-center items-center">
      <h1 className="text-2xl gap-4 flex flex-row items-center fixed left-4">
        <img alt="logo" width={32} height={32} src="/hero.png" />
        ClearCampus
      </h1>

      <div className="flex flex-row items-center gap-2">
        <Link href="/">
          <Button className={"w-24"} variant={page != 'home' ? "outline" : 'primary'}>Home</Button>
        </Link>
        <Link href="/students">
          <Button className={"w-24"} variant={page != 'students' ? "outline" : 'primary'}>
            Students
          </Button>
        </Link>
        <Link href="/clubs">
          <Button className={"w-24"} variant={page != 'clubs' ? "outline" : 'primary'}>
            Clubs
          </Button>
        </Link>
        <Link href="/events">
          <Button className={"w-24"} variant={page != 'events' ? "outline" : 'primary'}>
            Events
          </Button>
        </Link>
      </div>

      <div className="flex flex-row items-center gap-2 fixed right-4">
        {session ? (
          <>
            <Link href={dashboardHref}>
              <Button className={"w-28"} variant="secondary">
                Dashboard
              </Button>
            </Link>
            <Button
              className={"w-24"}
              variant="outline"
              onPress={() => {
                logout();
                navigate("/");
              }}
            >
              Log Out
            </Button>
          </>
        ) : (
          <>
            <Link href="/signup">
              <Button className={"w-24"} variant="secondary">
                Sign Up
              </Button>
            </Link>
            <Link href="/login">
              <Button className={"w-24"} variant="outline">
                Login
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
