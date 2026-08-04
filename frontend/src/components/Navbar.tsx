import { Button, Drawer, Link, useOverlayState } from "@heroui/react";
import { MenuIcon } from "lucide-react";
import { useNavigate } from "react-router";
import { useAuth } from "../lib/auth/AuthContext";

interface NavbarProps {
  page?: "home" | "students" | "clubs" | "events";
}

const NAV_LINKS: { href: string; label: string; page: NonNullable<NavbarProps["page"]> }[] = [
  { href: "/", label: "Home", page: "home" },
  { href: "/students", label: "Students", page: "students" },
  { href: "/clubs", label: "Clubs", page: "clubs" },
  { href: "/events", label: "Events", page: "events" },
];

export default function Navbar({ page }: NavbarProps) {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const menuState = useOverlayState();
  const dashboardHref = session?.user.role === "club" ? "/dashboard/club" : "/dashboard/student";

  return (
    <div className="fixed top-0 left-0 w-full flex flex-row px-4 pt-6 pb-4 sm:p-4 z-50 justify-center items-center">
      <h1 className="text-xl sm:text-2xl gap-2 sm:gap-4 flex flex-row items-center fixed left-4 top-6 sm:top-4">
        <img alt="logo" width={32} height={32} src="/hero.png" className="w-7 h-7 sm:w-8 sm:h-8" />
        ClearCampus
      </h1>

      {/* Desktop nav */}
      <div className="hidden md:flex flex-row items-center gap-2">
        {NAV_LINKS.map((link) => (
          <Link key={link.href} href={link.href}>
            <Button className={"w-24"} variant={page != link.page ? "outline" : "primary"}>
              {link.label}
            </Button>
          </Link>
        ))}
      </div>

      <div className="hidden md:flex flex-row items-center gap-2 fixed right-4 top-4">
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

      {/* Mobile menu */}
      <div className="md:hidden fixed right-4 top-6 sm:top-4">
        <Drawer state={menuState}>
          <Drawer.Trigger
            aria-label="Open menu"
            className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-default-200 bg-surface"
          >
            <MenuIcon size={18} />
          </Drawer.Trigger>
          <Drawer.Backdrop>
            <Drawer.Content placement="right">
              <Drawer.Dialog>
                <Drawer.Header>
                  <Drawer.Heading>Menu</Drawer.Heading>
                  <Drawer.CloseTrigger />
                </Drawer.Header>
                <Drawer.Body className="flex flex-col gap-2 pt-2">
                  {NAV_LINKS.map((link) => (
                    <Link key={link.href} href={link.href} className="w-full" onPress={menuState.close}>
                      <Button
                        className="w-full justify-start"
                        variant={page != link.page ? "outline" : "primary"}
                      >
                        {link.label}
                      </Button>
                    </Link>
                  ))}

                  <div className="h-px bg-default-200 my-2" />

                  {session ? (
                    <>
                      <Link href={dashboardHref} className="w-full" onPress={menuState.close}>
                        <Button className="w-full justify-start" variant="secondary">
                          Dashboard
                        </Button>
                      </Link>
                      <Button
                        className="w-full justify-start"
                        variant="outline"
                        onPress={() => {
                          menuState.close();
                          logout();
                          navigate("/");
                        }}
                      >
                        Log Out
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link href="/signup" className="w-full" onPress={menuState.close}>
                        <Button className="w-full justify-start" variant="secondary">
                          Sign Up
                        </Button>
                      </Link>
                      <Link href="/login" className="w-full" onPress={menuState.close}>
                        <Button className="w-full justify-start" variant="outline">
                          Login
                        </Button>
                      </Link>
                    </>
                  )}
                </Drawer.Body>
              </Drawer.Dialog>
            </Drawer.Content>
          </Drawer.Backdrop>
        </Drawer>
      </div>
    </div>
  );
}
