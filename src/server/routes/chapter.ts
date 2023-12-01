import { db } from "@/lib/db";
import { router, privateProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import Mux from "@mux/mux-node";

const { Video } = new Mux(
  process.env.MUX_TOKEN_ID!,
  process.env.MUX_TOKEN_SECRET!
);

export const chapterRouter = router({
  createChapter: privateProcedure
    .input(
      z.object({
        title: z.string().min(1),
        courseId: z.string().min(1),
      })
    )
    .mutation(async (opts) => {
      const { title, courseId } = opts.input;

      const courseOwner = await db.course.findUnique({
        where: {
          userId: opts.ctx.user.id,
          id: courseId,
        },
      });

      if (!courseOwner) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You are not the owner of this course",
        });
      }

      const lastChapter = await db.chapter.findFirst({
        where: {
          courseId: courseId,
        },
        orderBy: {
          position: "desc",
        },
      });

      const newPosition = lastChapter ? lastChapter.position + 1 : 1;

      const chapter = await db.chapter.create({
        data: {
          title,
          courseId: courseId,
          position: newPosition,
        },
      });

      return {
        code: 200,
        chapter,
      };
    }),
  reorderChapters: privateProcedure
    .input(
      z.object({
        courseId: z.string().min(1),
        list: z.array(
          z.object({
            id: z.string().min(1),
            position: z.number(),
          })
        ),
      })
    )
    .mutation(async (opts) => {
      const { courseId, list } = opts.input;

      const ownCourse = await db.course.findUnique({
        where: {
          id: courseId,
          userId: opts.ctx.user.id,
        },
      });
      if (!ownCourse) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You are not the owner of this course",
        });
      }

      for (let item of list) {
        await db.chapter.update({
          where: { id: item.id },
          data: { position: item.position },
        });
      }

      return {
        code: 200,
      };
    }),
  updateChapter: privateProcedure
    .input(
      z.object({
        title: z.string().min(1).optional(),
        description: z.string().min(1).optional(),
        isPublished: z.boolean().optional(),
        isFree: z.boolean().optional(),
        videoUrl: z.string().min(1).optional(),
        courseId: z.string().min(1),
        chapterId: z.string().min(1),
      })
    )
    .mutation(async (opts) => {
      const { courseId, chapterId, isPublished, ...values } = opts.input;

      const courseOwner = await db.course.findUnique({
        where: {
          id: courseId,
          userId: opts.ctx.user.id,
        },
      });

      if (!courseOwner) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You are not the owner of this course",
        });
      }

      const chapter = await db.chapter.update({
        where: {
          id: chapterId,
          courseId: courseId,
        },
        data: {
          ...values,
        },
      });

      if (values.videoUrl) {
        const existingMuxData = await db.muxData.findFirst({
          where: {
            chapterId: chapterId,
          },
        });
        if (existingMuxData) {
          await Video.Assets.del(existingMuxData.assetId);
          await db.muxData.delete({
            where: {
              id: existingMuxData.id,
            },
          });
        }

        const asset = await Video.Assets.create({
          input: values.videoUrl,
          playback_policy: "public",
          test: false,
        });

        await db.muxData.create({
          data: {
            assetId: asset.id,
            chapterId: chapterId,
            playbackId: asset.playback_ids?.[0]?.id,
          },
        });
      }

      return {
        code: 200,
        chapter,
      };
    }),
  deleteChapter: privateProcedure
    .input(
      z.object({
        courseId: z.string().min(1),
        chapterId: z.string().min(1),
      })
    )
    .mutation(async (opts) => {
      const { courseId, chapterId } = opts.input;

      const courseOwner = await db.course.findUnique({
        where: {
          id: courseId,
          userId: opts.ctx.user.id,
        },
      });

      if (!courseOwner) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You are not the owner of this course",
        });
      }

      const chapter = await db.chapter.findUnique({
        where: {
          id: chapterId,
          courseId: courseId,
        },
      });

      if (!chapter) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Chapter not found",
        });
      }

      if (chapter.videoUrl) {
        const existingMuxData = await db.muxData.findFirst({
          where: {
            chapterId: chapterId,
          },
        });

        if (existingMuxData) {
          await Video.Assets.del(existingMuxData.assetId);
          await db.muxData.delete({
            where: {
              id: existingMuxData.id,
            },
          });
        }

        const deletedChapter = await db.chapter.delete({
          where: {
            id: chapterId,
          },
        });

        const publishedChaptersInCourse = await db.chapter.findMany({
          where: {
            courseId: courseId,
            isPublished: true,
          },
        });

        if (!publishedChaptersInCourse.length) {
          await db.course.update({
            where: {
              id: courseId,
            },
            data: {
              isPublished: false,
            },
          });
        }

        return {
          code: 200,
          deletedChapter,
        };
      }
    }),
  publishChapter: privateProcedure
    .input(
      z.object({
        courseId: z.string().min(1),
        chapterId: z.string().min(1),
      })
    )
    .mutation(async (opts) => {
      const { courseId, chapterId } = opts.input;

      const courseOwner = await db.course.findUnique({
        where: {
          id: courseId,
          userId: opts.ctx.user.id,
        },
      });

      if (!courseOwner) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You are not the owner of this course",
        });
      }

      const chapter = await db.chapter.findUnique({
        where: {
          id: chapterId,
          courseId: courseId,
        },
      });

      const muxData = await db.muxData.findUnique({
        where: {
          chapterId: chapterId,
        },
      });

      if (
        !chapter ||
        !muxData ||
        !chapter.title ||
        !chapter.description ||
        !chapter.videoUrl
      ) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Fields are missing to publish this chapter",
        });
      }

      const publishedChapter = await db.chapter.update({
        where: {
          id: chapterId,
          courseId: courseId,
        },
        data: {
          isPublished: true,
        },
      });

      return {
        code: 200,
        publishedChapter,
      };
    }),
  unpublishChapter: privateProcedure
    .input(
      z.object({
        courseId: z.string().min(1),
        chapterId: z.string().min(1),
      })
    )
    .mutation(async (opts) => {
      const { courseId, chapterId } = opts.input;

      const courseOwner = await db.course.findUnique({
        where: {
          id: courseId,
          userId: opts.ctx.user.id,
        },
      });

      if (!courseOwner) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You are not the owner of this course",
        });
      }

      const unpublishedChapter = await db.chapter.update({
        where: {
          id: chapterId,
          courseId: courseId,
        },
        data: {
          isPublished: false,
        },
      });

      const publishedChaptersInCourse = await db.chapter.findMany({
        where: {
          courseId,
          isPublished: true,
        },
      });

      if (!publishedChaptersInCourse.length) {
        await db.course.update({
          where: {
            id: courseId,
          },
          data: {
            isPublished: false,
          },
        });
      }

      return {
        code: 200,
        unpublishedChapter,
      };
    }),
  onProgress: privateProcedure
    .input(
      z.object({
        isCompleted: z.boolean(),
        chapterId: z.string().min(1),
      })
    )
    .mutation(async (opts) => {
      const { isCompleted, chapterId } = opts.input;

      const userProgress = await db.userProgress.upsert({
        where: {
          userId_chapterId: {
            userId: opts.ctx.user.id,
            chapterId: chapterId,
          },
        },
        update: {
          isCompleted,
        },
        create: {
          userId: opts.ctx.user.id,
          chapterId: chapterId,
          isCompleted,
        },
      });

      return {
        code: 200,
        userProgress,
      };
    }),
});
