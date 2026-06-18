-- CreateTable
CREATE TABLE "vehiculo" (
    "id_vehiculo" SERIAL NOT NULL,
    "patente" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "capacidad_bidones" INTEGER NOT NULL,
    "id_vendedor" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "motivo_pausa" TEXT,

    CONSTRAINT "vehiculo_pkey" PRIMARY KEY ("id_vehiculo")
);

-- CreateTable
CREATE TABLE "chofer" (
    "id_chofer" SERIAL NOT NULL,
    "telefono" TEXT,
    "nombre" TEXT NOT NULL DEFAULT 'Chofer',
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "id_vehiculo" INTEGER,
    "id_zona" INTEGER,
    "alias" TEXT,
    "cbu_cvu" TEXT,
    "clerk_user_id" TEXT NOT NULL,
    "cuil_cuit" TEXT,
    "disponible" BOOLEAN NOT NULL DEFAULT true,
    "id_vendedor" TEXT NOT NULL,
    "nombre_empresa" TEXT,

    CONSTRAINT "chofer_pkey" PRIMARY KEY ("id_chofer")
);

-- CreateTable
CREATE TABLE "user_profile" (
    "id" SERIAL NOT NULL,
    "clerk_user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "id_vendedor" TEXT NOT NULL DEFAULT '',
    "nombre_empresa" TEXT,
    "nombre" TEXT,
    "telefono" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chofer_request" (
    "id" SERIAL NOT NULL,
    "clerk_user_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "id_vendedor" TEXT NOT NULL,
    "vendor_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chofer_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_access_control" (
    "id" SERIAL NOT NULL,
    "clerk_user_id" TEXT NOT NULL,
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "blocked_reason" TEXT,
    "blocked_by_clerk_user_id" TEXT,
    "blocked_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_access_control_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedido" (
    "idPedido" SERIAL NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ready',
    "id_chofer_asignado" INTEGER,
    "assigned_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),
    "motivo_revision" TEXT,
    "direccion" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "telefono" TEXT,
    "cantBidones" INTEGER NOT NULL,
    "zona" TEXT NOT NULL,
    "id_vendedor" TEXT NOT NULL DEFAULT '',
    "id_pedido_externo" TEXT,

    CONSTRAINT "pedido_pkey" PRIMARY KEY ("idPedido")
);

-- CreateTable
CREATE TABLE "zona" (
    "idZona" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "zona_pkey" PRIMARY KEY ("idZona")
);

-- CreateTable
CREATE TABLE "zona_empresa" (
    "id" SERIAL NOT NULL,
    "id_zona" INTEGER NOT NULL,
    "id_vendedor" TEXT NOT NULL,

    CONSTRAINT "zona_empresa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vehiculo_patente_key" ON "vehiculo"("patente");

-- CreateIndex
CREATE UNIQUE INDEX "chofer_clerk_user_id_key" ON "chofer"("clerk_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_profile_clerk_user_id_key" ON "user_profile"("clerk_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "chofer_request_clerk_user_id_key" ON "chofer_request"("clerk_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_access_control_clerk_user_id_key" ON "user_access_control"("clerk_user_id");

-- CreateIndex
CREATE INDEX "pedido_id_vendedor_idx" ON "pedido"("id_vendedor");

-- CreateIndex
CREATE UNIQUE INDEX "pedido_vendor_external_unique" ON "pedido"("id_vendedor", "id_pedido_externo");

-- CreateIndex
CREATE UNIQUE INDEX "zona_nombre_key" ON "zona"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "zona_empresa_id_zona_id_vendedor_key" ON "zona_empresa"("id_zona", "id_vendedor");

-- AddForeignKey
ALTER TABLE "chofer" ADD CONSTRAINT "chofer_id_vehiculo_fkey" FOREIGN KEY ("id_vehiculo") REFERENCES "vehiculo"("id_vehiculo") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chofer" ADD CONSTRAINT "chofer_id_zona_fkey" FOREIGN KEY ("id_zona") REFERENCES "zona"("idZona") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido" ADD CONSTRAINT "pedido_id_chofer_asignado_fkey" FOREIGN KEY ("id_chofer_asignado") REFERENCES "chofer"("id_chofer") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zona_empresa" ADD CONSTRAINT "zona_empresa_id_zona_fkey" FOREIGN KEY ("id_zona") REFERENCES "zona"("idZona") ON DELETE CASCADE ON UPDATE CASCADE;
