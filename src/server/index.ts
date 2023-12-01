import { router } from "./trpc";
import { courseRouter } from "./routes/course";
import { chapterRouter } from "./routes/chapter";

export const appRouter = router({
  course: courseRouter,
  chapter: chapterRouter,
});

export type AppRouter = typeof appRouter;
