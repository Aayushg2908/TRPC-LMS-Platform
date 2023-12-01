"use client";
import { Trash } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/modals/confirm-modal";
import { useConfettiStore } from "@/hooks/use-confetti-store";
import { trpc } from "@/app/_trpc/client";

interface ActionsProps {
  disabled: boolean;
  courseId: string;
  isPublished: boolean;
}

export const Actions = ({ disabled, courseId, isPublished }: ActionsProps) => {
  const router = useRouter();
  const confetti = useConfettiStore();
  const deleteCourse = trpc.course.deleteCourse.useMutation({
    onSuccess: () => {
      toast.success("Course deleted successfully");
      router.refresh();
      router.push("/teacher/courses");
    },
  });
  const publishCourse = trpc.course.publishCourse.useMutation({
    onSuccess: () => {
      toast.success("Course published successfully");
      confetti.onOpen();
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const unpublishCourse = trpc.course.unpublishCourse.useMutation({
    onSuccess: () => {
      toast.success("Course unspublished successfully");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const [isLoading, setIsLoading] = useState(false);

  const onClick = async () => {
    try {
      setIsLoading(true);
      if (isPublished) {
        await unpublishCourse.mutateAsync({ courseId });
      } else {
        await publishCourse.mutateAsync({ courseId });
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const onDelete = async () => {
    try {
      setIsLoading(true);
      await deleteCourse.mutateAsync({ courseId });
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-x-2">
      <Button
        onClick={onClick}
        disabled={disabled || isLoading}
        variant="outline"
        size="sm"
      >
        {isPublished ? "Unpublish" : "Publish"}
      </Button>
      <ConfirmModal onConfirm={onDelete}>
        <Button size="sm" disabled={isLoading}>
          <Trash className="h-4 w-4" />
        </Button>
      </ConfirmModal>
    </div>
  );
};