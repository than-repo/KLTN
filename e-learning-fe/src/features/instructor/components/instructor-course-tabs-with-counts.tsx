"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { InstructorCourseTabs } from "./instructor-course-tabs";
import { getInstructorCourseSkills } from "../api/instructor-skill-api";
import { getInstructorAssessments } from "../api/instructor-assessment-api";

interface InstructorCourseTabsWithCountsProps {
  courseId: string;
  currentTab: "curriculum" | "skills" | "settings" | "assessments" | "preview";
}

async function getInstructorCourseAssessments(courseId: string, accessToken: string) {
  const response = await getInstructorAssessments(courseId, { limit: 100, page: 1 }, accessToken);
  return response.data ?? [];
}

export function InstructorCourseTabsWithCounts({
  courseId,
  currentTab,
}: InstructorCourseTabsWithCountsProps) {
  const { accessToken, status } = useAuth();
  const [skillsCount, setSkillsCount] = useState(0);
  const [assessmentsCount, setAssessmentsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated" || !accessToken) {
      setLoading(false);
      return;
    }

    async function fetchCounts() {
      if (!accessToken) return;
      try {
        const [skills, assessments] = await Promise.all([
          getInstructorCourseSkills(courseId, accessToken),
          getInstructorCourseAssessments(courseId, accessToken),
        ]);
        setSkillsCount(skills.length);
        setAssessmentsCount(assessments.length);
      } catch {
        // Ignore errors, default to 0
      } finally {
        setLoading(false);
      }
    }

    void fetchCounts();
  }, [courseId, accessToken, status]);

  if (loading) {
    return <InstructorCourseTabs courseId={courseId} currentTab={currentTab} />;
  }

  return (
    <InstructorCourseTabs
      courseId={courseId}
      currentTab={currentTab}
      skillsCount={skillsCount}
      assessmentsCount={assessmentsCount}
    />
  );
}