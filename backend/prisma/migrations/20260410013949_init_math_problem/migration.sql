-- CreateTable
CREATE TABLE "MathProblem" (
    "id" SERIAL NOT NULL,
    "question" TEXT NOT NULL,
    "choice" TEXT[],
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MathProblem_pkey" PRIMARY KEY ("id")
);
