import prisma from "../src/config/prisma.js";

async function main() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: "test@example.com" },
    });
    console.log("Found user:", user);
  } catch (err) {
    console.error("Full error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
