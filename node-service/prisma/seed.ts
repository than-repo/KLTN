import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from 'generated/prisma/client';

const adapter = new PrismaMariaDb({
  host: 'localhost',
  port: 3310,
  user: 'user',
  password: 'userpassword123',
  database: 'elearning_db',
});

const prisma = new PrismaClient({ adapter });

type SkillSeed = {
  name: string;
  description?: string;
  aliases?: string[];
  parent?: string;
};

const skills: SkillSeed[] = [
  {
    name: 'NestJS',
    description:
      'A progressive Node.js framework for building server-side applications.',
    aliases: ['Nest.js', 'NestJS Framework'],
  },
  {
    name: 'Fundamentals',
    description: 'Core concepts and architecture of NestJS.',
    parent: 'NestJS',
  },
  {
    name: 'Module',
    description:
      'A NestJS module organizes related providers, controllers, and application capabilities.',
    aliases: ['NestJS Module'],
    parent: 'Fundamentals',
  },
  {
    name: 'Controller',
    description:
      'A NestJS controller handles incoming requests and returns responses.',
    aliases: ['NestJS Controller'],
    parent: 'Fundamentals',
  },
  {
    name: 'Provider',
    description:
      'A NestJS provider is an injectable component used to implement application logic and dependencies.',
    aliases: ['NestJS Provider', 'Service', 'Injectable Provider'],
    parent: 'Fundamentals',
  },
  {
    name: 'Dependency Injection',
    description:
      'A design pattern where dependencies are provided to a component instead of being created internally.',
    aliases: ['DI', 'NestJS DI'],
    parent: 'NestJS',
  },
  {
    name: 'Middleware',
    description:
      'NestJS middleware functions execute before the route handler.',
    aliases: ['NestJS Middleware'],
    parent: 'NestJS',
  },
  {
    name: 'Guard',
    description:
      'NestJS guards determine whether a request can continue based on authorization or other conditions.',
    aliases: ['NestJS Guard', 'Authorization Guard'],
    parent: 'NestJS',
  },
  {
    name: 'Interceptor',
    description:
      'NestJS interceptors can transform requests and responses or add behavior around handler execution.',
    aliases: ['NestJS Interceptor'],
    parent: 'NestJS',
  },
  {
    name: 'Pipe',
    description:
      'NestJS pipes transform input data or validate incoming request data.',
    aliases: ['NestJS Pipe', 'Validation Pipe'],
    parent: 'NestJS',
  },
  {
    name: 'Exception Filter',
    description:
      'NestJS exception filters customize how exceptions are handled and responses are generated.',
    aliases: ['NestJS Exception Filter'],
    parent: 'NestJS',
  },
  {
    name: 'Authentication',
    description: 'Techniques for verifying the identity of users or clients.',
    aliases: ['Auth', 'User Authentication'],
    parent: 'NestJS',
  },
  {
    name: 'JWT Authentication',
    description: 'Authentication using JSON Web Tokens.',
    aliases: ['JWT Auth', 'JWT', 'JSON Web Token Authentication'],
    parent: 'Authentication',
  },
  {
    name: 'Passport',
    description: 'Authentication middleware commonly used with NestJS.',
    aliases: ['NestJS Passport', 'Passport.js'],
    parent: 'Authentication',
  },
  {
    name: 'Database',
    description:
      'Database integration and data persistence in NestJS applications.',
    aliases: ['Database Integration'],
    parent: 'NestJS',
  },
  {
    name: 'Prisma',
    description: 'A modern ORM and database toolkit commonly used with NestJS.',
    aliases: ['Prisma ORM', 'Prisma Client'],
    parent: 'Database',
  },
  {
    name: 'TypeORM',
    description:
      'An ORM commonly used for database access in NestJS applications.',
    aliases: ['NestJS TypeORM'],
    parent: 'Database',
  },
];

async function main() {
  const skillMap = new Map<string, string>();

  for (const skill of skills) {
    const parentId = skill.parent ? (skillMap.get(skill.parent) ?? null) : null;

    const level = parentId
      ? (
          await prisma.skill.findUnique({
            where: { id: parentId },
            select: { level: true },
          })
        )?.level! + 1
      : 0;

    const created = await prisma.skill.upsert({
      where: {
        canonicalName: skill.name,
      },
      update: {
        description: skill.description,
        aliases: skill.aliases ?? [],
        parentId,
        level,
        status: 'ACTIVE',
      },
      create: {
        canonicalName: skill.name,
        description: skill.description,
        aliases: skill.aliases ?? [],
        parentId,
        level,
        status: 'ACTIVE',
      },
    });

    skillMap.set(skill.name, created.id);
  }

  console.log(`Seeded ${skills.length} skills.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
