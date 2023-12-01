import { db } from "@/lib/db";
import { router, privateProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import Mux from "@mux/mux-node";

const { Video } = new Mux(
  process.env.MUX_TOKEN_ID!,
  process.env.MUX_TOKEN_SECRET!
);

export const courseRouter = router({
  createCourse: privateProcedure
    .input(
      z.object({
        title: z.string().min(1),
      })
    )
    .mutation(async (opts) => {
      const { title } = opts.input;

      const course = await db.course.create({
        data: {
          userId: opts.ctx.user.id,
          title,
        },
      });

      return {
        code: 200,
        course,
      };
    }),
  updateCourse: privateProcedure
    .input(
      z.object({
        title: z.string().min(1).optional(),
        description: z.string().min(1).optional(),
        imageUrl: z.string().min(1).optional(),
        categoryId: z.string().min(1).optional(),
        price: z.coerce.number().optional(),
        courseId: z.string(),
      })
    )
    .mutation(async (opts) => {
      const { courseId, ...values } = opts.input;

      const course = await db.course.update({
        where: {
          id: courseId,
          userId: opts.ctx.user.id,
        },
        data: {
          ...values,
        },
      });

      return {
        code: 200,
        course,
      };
    }),
  updateCourseAttachment: privateProcedure
    .input(
      z.object({
        url: z.string().min(1),
        courseId: z.string().min(1),
      })
    )
    .mutation(async (opts) => {
      const { url, courseId } = opts.input;

      const courseOwner = await db.course.findUnique({
        where: {
          userId: opts.ctx.user.id,
          id: courseId,
        },
      });

      if (!courseOwner) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
        });
      }

      const attachment = await db.attachment.create({
        data: {
          url,
          name: url.split("/").pop() || "",
          courseId,
        },
      });

      return {
        code: 200,
        attachment,
      };
    }),
  deleteAttachment: privateProcedure
    .input(
      z.object({
        id: z.string().min(1),
        courseId: z.string().min(1),
      })
    )
    .mutation(async (opts) => {
      const { id, courseId } = opts.input;

      const courseOwner = await db.course.findUnique({
        where: {
          userId: opts.ctx.user.id,
          id: courseId,
        },
      });
      if (!courseOwner) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
        });
      }

      const attachment = await db.attachment.delete({
        where: {
          courseId: courseId,
          id: id,
        },
      });

      return {
        code: 200,
        attachment,
      };
    }),
  deleteCourse: privateProcedure
    .input(
      z.object({
        courseId: z.string().min(1),
      })
    )
    .mutation(async (opts) => {
      const { courseId } = opts.input;

      const course = await db.course.findUnique({
        where: {
          id: courseId,
          userId: opts.ctx.user.id,
        },
        include: {
          chapters: {
            include: {
              muxData: true,
            },
          },
        },
      });

      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
        });
      }

      for (const chapter of course.chapters) {
        if (chapter.muxData?.assetId) {
          await Video.Assets.del(chapter.muxData.assetId);
        }
      }

      const deletedCourse = await db.course.delete({
        where: {
          id: courseId,
        },
      });

      return {
        code: 200,
        deletedCourse,
      };
    }),
  publishCourse: privateProcedure
    .input(
      z.object({
        courseId: z.string().min(1),
      })
    )
    .mutation(async (opts) => {
      const { courseId } = opts.input;

      const course = await db.course.findUnique({
        where: {
          id: courseId,
          userId: opts.ctx.user.id,
        },
        include: {
          chapters: {
            include: {
              muxData: true,
            },
          },
        },
      });

      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
        });
      }

      const hasPublishedChapter = course.chapters.some(
        (chapter) => chapter.isPublished
      );

      if (
        !course.title ||
        !course.description ||
        !course.imageUrl ||
        !course.categoryId ||
        !hasPublishedChapter
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Please fill out all the fields and publish at least one chapter",
        });
      }

      const publishedCourse = await db.course.update({
        where: {
          id: courseId,
          userId: opts.ctx.user.id,
        },
        data: {
          isPublished: true,
        },
      });

      return {
        code: 200,
        publishedCourse,
      };
    }),
  unpublishCourse: privateProcedure
    .input(
      z.object({
        courseId: z.string().min(1),
      })
    )
    .mutation(async (opts) => {
      const { courseId } = opts.input;

      const course = await db.course.findUnique({
        where: {
          id: courseId,
          userId: opts.ctx.user.id,
        },
      });

      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
        });
      }

      const unpublishedCourse = await db.course.update({
        where: {
          id: courseId,
          userId: opts.ctx.user.id,
        },
        data: {
          isPublished: false,
        },
      });

      return {
        code: 200,
        unpublishedCourse,
      };
    }),
});
