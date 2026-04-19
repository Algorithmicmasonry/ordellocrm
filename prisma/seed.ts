import { PrismaClient } from "@prisma/client";
import { auth } from "../lib/auth";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding users only...");

  // ================================
  // ADMIN USER
  // ================================
  try {
    await auth.api.signUpEmail({
      body: {
        email: "admin@ordo.com",
        password: "admin123",
        name: "Admin User",
      },
    });

    await prisma.user.update({
      where: { email: "admin@ordo.com" },
      data: {
        role: "ADMIN",
        emailVerified: true,
      },
    });

    console.log("✅ Created admin user");
  } catch (e: any) {
    if (e.message?.includes("already exists")) {
      console.log("⚠️ Admin already exists, skipping...");
    } else {
      throw e;
    }
  }

  // ================================
  // SALES REPS
  // ================================
  const salesReps = [
    { email: "john.doe@ordo.com", name: "John Doe" },
    { email: "jane.smith@ordo.com", name: "Jane Smith" },
    { email: "michael.obi@ordo.com", name: "Michael Obi" },
    { email: "sarah.adeyemi@ordo.com", name: "Sarah Adeyemi" },
    { email: "david.uche@ordo.com", name: "David Uche" },
  ];

  for (const rep of salesReps) {
    try {
      await auth.api.signUpEmail({
        body: {
          email: rep.email,
          password: "sales123",
          name: rep.name,
        },
      });

      await prisma.user.update({
        where: { email: rep.email },
        data: {
          role: "SALES_REP",
          emailVerified: true,
        },
      });

      console.log(`✅ Created sales rep: ${rep.name}`);
    } catch (e: any) {
      if (e.message?.includes("already exists")) {
        console.log(`⚠️ ${rep.name} already exists, skipping...`);
      } else {
        throw e;
      }
    }
  }

  console.log("");
  console.log("🎉 Seeding completed (users only)");
  console.log("");
  console.log("Login credentials:");
  console.log("Admin:");
  console.log("  admin@ordo.com / admin123");
  console.log("");
  console.log("Sales reps (password: sales123):");
  salesReps.forEach((rep) => console.log(`  - ${rep.email}`));
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
