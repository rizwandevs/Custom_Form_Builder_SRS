import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export const fieldInputSchema = {
  type: true,
  label: true,
  name: true,
  order: true,
  required: true,
  options: true,
  validation: true,
  settings: true,
} as const;

export type FieldInputData = {
  type: string;
  label: string;
  name: string;
  order: number;
  required?: boolean;
  options?: Prisma.InputJsonValue;
  validation?: Prisma.InputJsonValue;
  settings?: Prisma.InputJsonValue;
};

export function serializeForm(form: {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  status: string;
  settings: unknown;
  createdAt: Date;
  updatedAt: Date;
  fields?: Array<{
    id: number;
    type: string;
    label: string;
    name: string;
    order: number;
    required: boolean;
    options: unknown;
    validation: unknown;
    settings: unknown;
  }>;
  _count?: { submissions: number };
}) {
  return {
    id: form.id,
    title: form.title,
    slug: form.slug,
    description: form.description,
    status: form.status,
    settings: form.settings,
    createdAt: form.createdAt,
    updatedAt: form.updatedAt,
    submissionCount: form._count?.submissions ?? 0,
    fields: form.fields
      ?.sort((a, b) => a.order - b.order)
      .map((f) => ({
        id: f.id,
        type: f.type,
        label: f.label,
        name: f.name,
        order: f.order,
        required: f.required,
        options: f.options,
        validation: f.validation,
        settings: f.settings,
      })),
  };
}

export async function getFormForUser(formId: number, userId: number) {
  return prisma.form.findFirst({
    where: { id: formId, createdById: userId },
    include: {
      fields: { orderBy: { order: 'asc' } },
      _count: { select: { submissions: true } },
    },
  });
}
