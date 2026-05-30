import * as k8s from "@kubernetes/client-node";
import sql from "../db/sql.js";

const clients = new Map<string, { core: k8s.CoreV1Api; metrics: k8s.Metrics }>();

export async function getK8sClient(clusterId: string) {
  if (clients.has(clusterId)) return clients.get(clusterId)!;

  const [cluster] = await sql`
    SELECT connection_type, kubeconfig_encrypted FROM clusters WHERE cluster_id = ${clusterId}
  `;
  if (!cluster) throw new Error("Cluster not found");

  const kc = new k8s.KubeConfig();
  if (cluster.kubeconfig_encrypted) {
    kc.loadFromString(cluster.kubeconfig_encrypted);
  } else {
    kc.loadFromDefault();
  }

  const client = {
    core: kc.makeApiClient(k8s.CoreV1Api),
    metrics: new k8s.Metrics(kc),
  };
  clients.set(clusterId, client);
  return client;
}
