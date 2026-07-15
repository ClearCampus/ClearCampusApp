import { Button } from "@heroui/react";
import { BookmarkIcon } from "lucide-react";
import { useNavigate } from "react-router";
import { useAuth } from "../lib/auth/AuthContext";
import { useStudentData } from "../lib/data/StudentDataContext";

interface SaveButtonProps {
  kind: "club" | "event";
  /** Club slug for kind="club", or `eventKey(clubSlug, eventId)` for kind="event". */
  id: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function SaveButton({ kind, id, size = "sm", className }: SaveButtonProps) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { isClubSaved, isEventSaved, toggleSavedClub, toggleSavedEvent } = useStudentData();

  const saved = kind === "club" ? isClubSaved(id) : isEventSaved(id);
  const label = saved ? `Unsave ${kind}` : `Save ${kind}`;

  return (
    <Button
      variant={saved ? "secondary" : "outline"}
      size={size}
      isIconOnly
      aria-label={label}
      className={className}
      onPress={() => {
        if (!session || session.user.role !== "student") {
          navigate("/login");
          return;
        }
        if (kind === "club") toggleSavedClub(id);
        else toggleSavedEvent(id);
      }}
    >
      <BookmarkIcon size={16} fill={saved ? "currentColor" : "none"} />
    </Button>
  );
}
