import { Router, type Request, type Response } from "express";
import { zEnrollmentBody } from "../libs/zodValidators.ts";

import type { CustomRequest } from "../libs/types.ts";

// import authentication middleware
import { authenticateToken } from "../middlewares/authenMiddleware.ts";
import { checkRoles } from "../middlewares/checkRolesDBMiddleware.ts";

// import database
import { PrismaClient } from "../../generated/prisma/client.ts";
import { success } from "zod";
const prisma = new PrismaClient();

const router = Router();

// GET /api/v3/enrollments
// ADMIN: get all enrollments, STUDENT: get only his own enrollments
router.get(
  "/",
  authenticateToken,
  checkRoles,
  async (req: CustomRequest, res: Response) => {
    try {
      const user = req.user;
      const enrollments = await prisma.enrollment.findMany({
        where:
          user?.role === "STUDENT" ? { studentId: user.studentId ?? "" } : {},
        orderBy: { createdAt: "asc" },
      });

      return res.json({
        success: true,
        data: enrollments,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  },
);

// POST /api/v3/enrollments, body = {studentId, courseId}
// ADMIN: enroll any student, STUDENT: enroll only himself
router.post(
  "/",
  authenticateToken,
  checkRoles,
  async (req: CustomRequest, res: Response) => {
    try {
      // validate req.body
      const result = zEnrollmentBody.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: result.error.issues[0]?.message,
        });
      }
      const { studentId, courseId } = result.data;

      // STUDENT can enroll only himself
      const user = req.user;
      if (user?.role === "STUDENT" && studentId !== user.studentId) {
        return res.status(403).json({
          success: false,
          message: "Forbidden access",
        });
      }

      // check if student and course exist
      const student = await prisma.student.findUnique({
        where: { studentId },
      });
      if (!student) {
        return res.status(404).json({
          success: false,
          message: `Student ${studentId} does not exists`,
        });
      }
      const course = await prisma.course.findUnique({ where: { courseId } });
      if (!course) {
        return res.status(404).json({
          success: false,
          message: `Course ${courseId} does not exists`,
        });
      }

      // check if the student already enrolled in this course
      const enrolled = await prisma.enrollment.findFirst({
        where: { studentId, courseId },
      });
      if (enrolled) {
        return res.status(409).json({
          success: false,
          message: `Student ${studentId} has already enrolled in ${courseId}`,
        });
      }

      const created = await prisma.enrollment.create({
        data: { studentId, courseId },
      });

      return res.status(201).json({
        success: true,
        data: created,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  },
);

// TODO การบ้าน 2.1: PUT /api/v3/enrollments, body = {studentId, courseId, newCourseId}
//   เปลี่ยนวิชาที่ลงทะเบียนไว้ (courseId → newCourseId)
//   - ADMIN แก้ได้ทุกคน / STUDENT แก้ได้แค่ของตัวเอง (403)
//   - validate body (400), ยังไม่ได้ลงวิชาเดิม (404), วิชาใหม่ = วิชาเดิม (400),
//     วิชาใหม่ไม่มีจริง (404), ลงวิชาใหม่ไว้แล้ว (409)
router.put("/", authenticateToken ,checkRoles,async(req:CustomRequest,res:Response)=>{
  try{
  const user = req.user;
  const body = req.body;
  const result = body.zEnrollmentPutBody
  const {studentId,courseId,newCourseId} = result.data;
  if(!result.success){
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: result.error.issues[0]?.message,
    })
  }
  let found_student = null;
        if (user?.studentId) {
          // get student from DB by studentId
          found_student = await prisma.student.findUnique({
            where: { studentId: user.studentId },
          });
        }
  
        // if student is not found
        if (!found_student) {
          return res.status(404).json({
            success: false,
            message: "Student does not exists",
          });
        }
  
        // if STUDENT does not own the data
        if (
          user?.role === "STUDENT" &&
          found_student.studentId !== user.studentId
        ) {
          return res.status(403).json({
            success: false,
            message: "Forbidden access",
          });
        }

        if(courseId === newCourseId){
          return res.status(400).json({
            success: false,
            message: "Already Enrolled",
          })
        }
        const existingEnrollment = await prisma.enrollment.findFirst({
          where: { studentId, courseId },
        });

        if (!existingEnrollment) {
          return res.status(404).json({
            success: false,
            message: "Original enrollment not found",
          });
        }
        const newCourseExists = await prisma.course.findUnique({
          where: { courseId: newCourseId },
        });

        if (!newCourseExists) {
          return res.status(404).json({
            success: false,
            message: "New course does not exist",
          });
        }
        const isAlreadyEnrolledNewCourse = await prisma.enrollment.findFirst({
          where: { studentId, courseId: newCourseId },
        });

        if (isAlreadyEnrolledNewCourse) {
          return res.status(409).json({
            success: false,
            message: "Already enrolled in the new course",
          });
        }
        const updatedEnrollment = await prisma.enrollment.update({
          where: {
            id: existingEnrollment.id, // ใช้ id ของ enrollment หรือ composite key (studentId_courseId)
          },
          data: {
            courseId: newCourseId,
          },
        });
          return res.status(200).json({
          success: true,
          message: "Enrollment updated successfully",
          data: updatedEnrollment,
        });
      }catch(err){
        return res.status(500).json({
          success: false,
          message: "Something went wrong",
        })
      }
        
})

// TODO การบ้าน 2.2: DELETE /api/v3/enrollments, body = {studentId, courseId}
//   ยกเลิกการลงทะเบียน (drop)
//   - ADMIN ลบได้ทุกคน / STUDENT ลบได้แค่ของตัวเอง (403)
//   - validate body (400), ไม่พบการลงทะเบียน (404)
router.delete("/",authenticateToken,checkRoles,async(req:CustomRequest,res:Response)=>{
  try{
    const body = req.body;
    const user = req.user;
    const {studentId,courseId} = body.data;
    if(user?.role === "STUDENT" && user.studentId !== studentId){
      return res.status(403).json({
        success: false,
        message: "Forbidden access",
      })
    }
    const existingEnrollment = await prisma.enrollment.findFirst({
        where: {studentId , courseId },
    });
    if (!existingEnrollment) {
        return res.status(404).json({
          success: false,
          message: "Enrollment not found",
        });
      }
      const deletedEnrollment = await prisma.enrollment.delete({
        where: {
          id: existingEnrollment.id,
        },
      }); 

      return res.status(200).json({
        success: true,
        message: "Enrollment deleted successfully",
        data: deletedEnrollment,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
})

export default router;
