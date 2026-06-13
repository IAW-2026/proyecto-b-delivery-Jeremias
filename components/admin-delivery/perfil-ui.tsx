"use client";

import PerfilPage from "@/components/logistic-admin/perfil-ui";

type Props = {
  fallbackName?: string | null;
};

export default function AdminDeliveryPerfilUi(props: Props) {
  return <PerfilPage {...props} />;
}
