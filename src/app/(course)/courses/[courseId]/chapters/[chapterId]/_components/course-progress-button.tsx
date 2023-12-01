"use client";
import axios from "axios";
import { CheckCircle, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { useConfettiStore } from "@/hooks/use-confetti-store";
import { trpc } from "@/app/_trpc/client";

interface CourseProgressButtonProps {
  chapterId: string;
  courseId: string;
  isCompleted?: boolean;
  nextChapterId?: string;
}

export const CourseProgressButton = ({
  chapterId,
  courseId,
  isCompleted,
  nextChapterId,
}: CourseProgressButtonProps) => {
  const router = useRouter();
  const confetti = useConfettiStore();
  const [isLoading, setIsLoading] = useState(false);
  const onProgress = trpc.chapter.onProgress.useMutation({
    onSuccess: (data) => {
      if (data.code === 200) {
        if (!isCompleted && !nextChapterId) {
          confetti.onOpen();
        }

        if (!isCompleted && nextChapterId) {
          router.push(`/courses/${courseId}/chapters/${nextChapterId}`);
        }

        toast.success("Progress updated");
        router.refresh();
      }
    },
  });

  const onClick = async () => {
    try {
      setIsLoading(true);
      await onProgress.mutateAsync({ chapterId, isCompleted: !isCompleted });
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const Icon = isCompleted ? XCircle : CheckCircle;

  return (
    <Button
      onClick={onClick}
      disabled={isLoading}
      type="button"
      variant={isCompleted ? "outline" : "success"}
      className="w-full md:w-auto"
    >
      {isCompleted ? "Not completed" : "Mark as complete"}
      <Icon className="h-4 w-4 ml-2" />
    </Button>
  );
};
