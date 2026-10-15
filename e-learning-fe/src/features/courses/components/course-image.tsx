import Image from "next/image";

import type { PublicCourse } from "../types/course";
import { canUseNextImage, getCourseImageSource } from "../utils/course-data";

type CourseImageProps = {
  course: PublicCourse;
};

export function CourseImage({ course }: CourseImageProps) {
  const imageSource = getCourseImageSource(course);

  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-md bg-muted">
      {canUseNextImage(imageSource) ? (
        <Image
          alt={course.title}
          className="object-cover"
          fill
          sizes="(min-width: 1024px) 28vw, (min-width: 640px) 45vw, 100vw"
          src={imageSource}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={course.title}
          className="h-full w-full object-cover"
          loading="lazy"
          src={imageSource}
        />
      )}
    </div>
  );
}
