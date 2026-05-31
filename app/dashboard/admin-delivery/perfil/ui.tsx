"use client";

import LogisticAdminPerfilUi from "../../logistic-admin/perfil/ui";

type Props = {
  fallbackName?: string | null;
};

export default function AdminDeliveryPerfilUi(props: Props) {
  return <LogisticAdminPerfilUi {...props} />;
}
