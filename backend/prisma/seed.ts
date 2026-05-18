import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { name: 'Admin User' },
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      passwordHash,
      role: 'admin',
    },
  });

  const existingForm = await prisma.form.findFirst({
    where: { slug: 'contact-us' },
  });

  if (!existingForm) {
    await prisma.form.create({
      data: {
        title: 'Contact Us',
        slug: 'contact-us',
        description: 'Sample contact form',
        status: 'published',
        createdById: admin.id,
        settings: {
          thankYouMessage: 'Thank you for contacting us!',
        },
        fields: {
          create: [
            {
              type: 'text',
              label: 'Full Name',
              name: 'full_name',
              order: 0,
              required: true,
              settings: { placeholder: 'John Doe' },
            },
            {
              type: 'email',
              label: 'Email',
              name: 'email',
              order: 1,
              required: true,
              settings: { placeholder: 'john@example.com' },
            },
            {
              type: 'textarea',
              label: 'Message',
              name: 'message',
              order: 2,
              required: true,
              settings: { placeholder: 'Your message...' },
            },
          ],
        },
      },
    });
  }

  console.log('Seed completed. Admin: admin@example.com / admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
