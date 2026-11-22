'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Video } from 'lucide-react';
import { useCreateLecture } from '@/src/hooks/useLectures';
import { useCourses } from '@/src/hooks/useCourses';
import { EntityForm, FormSection, FormInput, FormTextarea } from '@/src/components/admin/EntityForm';
import { CourseTreeSelect } from '@/src/components/admin/CourseTreeSelect';
import { useTx } from '@/src/lib/ui-text';

export default function AddLecturePage() {
  const tx = useTx();
  const router = useRouter();
  const { mutate: createLecture, isLoading, error } = useCreateLecture();
  const { data: courses, isLoading: isLoadingCourses } = useCourses();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    course_id: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createLecture({
        title: formData.title,
        description: formData.description,
        course_id: parseInt(formData.course_id),
      });
      router.push('/lectures');
    } catch {
      // Error handled by hook
    }
  };

  return (
    <EntityForm
      title={tx("Add New Lecture")}
      description={tx("Create a new lecture for a course")}
      backHref="/lectures"
      onSubmit={handleSubmit}
      isLoading={isLoading || isLoadingCourses}
      error={error}
    >
      <FormSection title={tx("Lecture Information")} icon={<Video className="w-4 h-4" />}>
        <CourseTreeSelect
          label={tx("Course")}
          required
          value={formData.course_id}
          onChange={(val) => setFormData({ ...formData, course_id: val })}
        />
        <FormInput
          label={tx("Lecture Title")}
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., Introduction to Physics"
        />
        <FormTextarea
          label={tx("Description")}
          required
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder={tx("Enter lecture description...")}
          rows={4}
        />
      </FormSection>
    </EntityForm>
  );
}
