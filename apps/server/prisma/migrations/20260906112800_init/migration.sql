-- CreateTable
CREATE TABLE "Place" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerPlaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "categoryGroup" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "roadAddress" TEXT,
    "phone" TEXT,
    "url" TEXT,
    "parking" TEXT NOT NULL DEFAULT 'unknown',
    "priceHintKrw" INTEGER,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AreaFetch" (
    "id" TEXT NOT NULL,
    "anchorKey" TEXT NOT NULL,
    "anchorName" TEXT NOT NULL,
    "anchorLat" DOUBLE PRECISION NOT NULL,
    "anchorLng" DOUBLE PRECISION NOT NULL,
    "radiusM" INTEGER NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AreaFetch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AreaFetchPlace" (
    "areaFetchId" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,

    CONSTRAINT "AreaFetchPlace_pkey" PRIMARY KEY ("areaFetchId","placeId")
);

-- CreateTable
CREATE TABLE "WebMention" (
    "id" TEXT NOT NULL,
    "areaFetchId" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "placeNameRaw" TEXT NOT NULL,
    "hint" TEXT,
    "priceHintKrw" INTEGER,
    "parking" TEXT NOT NULL DEFAULT 'unknown',
    "sourceUrl" TEXT NOT NULL,
    "sourceTitle" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "WebMention_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Place_fetchedAt_idx" ON "Place"("fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Place_provider_providerPlaceId_key" ON "Place"("provider", "providerPlaceId");

-- CreateIndex
CREATE UNIQUE INDEX "AreaFetch_anchorKey_key" ON "AreaFetch"("anchorKey");

-- CreateIndex
CREATE INDEX "AreaFetch_fetchedAt_idx" ON "AreaFetch"("fetchedAt");

-- CreateIndex
CREATE INDEX "WebMention_placeId_idx" ON "WebMention"("placeId");

-- CreateIndex
CREATE UNIQUE INDEX "WebMention_areaFetchId_placeId_sourceUrl_key" ON "WebMention"("areaFetchId", "placeId", "sourceUrl");

-- AddForeignKey
ALTER TABLE "AreaFetchPlace" ADD CONSTRAINT "AreaFetchPlace_areaFetchId_fkey" FOREIGN KEY ("areaFetchId") REFERENCES "AreaFetch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AreaFetchPlace" ADD CONSTRAINT "AreaFetchPlace_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebMention" ADD CONSTRAINT "WebMention_areaFetchId_fkey" FOREIGN KEY ("areaFetchId") REFERENCES "AreaFetch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebMention" ADD CONSTRAINT "WebMention_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;
