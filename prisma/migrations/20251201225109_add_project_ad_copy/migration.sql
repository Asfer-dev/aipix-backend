-- CreateTable
CREATE TABLE "ProjectAdCopy" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "keywords" TEXT,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectAdCopy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectAdCopy_projectId_idx" ON "ProjectAdCopy"("projectId");

-- AddForeignKey
ALTER TABLE "ProjectAdCopy" ADD CONSTRAINT "ProjectAdCopy_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAdCopy" ADD CONSTRAINT "ProjectAdCopy_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
