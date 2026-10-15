import type { PublicCourse } from "../types/course";
import { CourseCard } from "./course-card";

type CourseGridProps = {
  courses: PublicCourse[];
};

export function CourseGrid({ courses }: CourseGridProps) {
  if (courses.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card px-5 py-14 text-center">
        <p className="text-lg font-semibold">No courses found</p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          Try changing your search or clearing a few filters to see more
          courses.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {courses.map((course) => (
        <CourseCard course={course} key={course.id} />
      ))}
    </div>
  );
}
