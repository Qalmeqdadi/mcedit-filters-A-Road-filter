import { accelerators } from './accelerators';
import { capabilityGroups } from './capabilities';
import { controlDomains } from './control';
import { osLayers } from './operatingSystem';
import { sectors } from './sectors';
import { services } from './services';
import type { ServiceId } from './types';

/**
 * Relationship graph used by the master architecture.
 * Node ids are prefixed by kind: sector:, os:, ctl:, svc:, grp:, acc:, tech:.
 * Every edge is derived from the structured data, so relationships never drift from content.
 */
export type NodeKind = 'sector' | 'os' | 'ctl' | 'svc' | 'grp' | 'acc' | 'tech';
export const nodeId = (kind: NodeKind, id: string) => `${kind}:${id}`;

/** Capability groups a service draws on substantially (two or more capabilities, or its home group). */
export function groupsForService(serviceId: ServiceId) {
  return capabilityGroups
    .filter(
      (g) =>
        g.homeService === serviceId || g.capabilities.filter((c) => c.services.includes(serviceId)).length >= 2,
    )
    .map((g) => g.id);
}

const edges: [string, string][] = [];
const add = (a: string, b: string) => edges.push([a, b]);

for (const sector of sectors) {
  for (const layer of osLayers) add(nodeId('sector', sector.id), nodeId('os', layer.id));
  for (const s of sector.leadServices) add(nodeId('sector', sector.id), nodeId('svc', s));
}

for (const layer of osLayers) {
  for (const s of layer.services) add(nodeId('os', layer.id), nodeId('svc', s));
  for (const c of layer.controlFocus) add(nodeId('os', layer.id), nodeId('ctl', c));
  for (const t of layer.tech) add(nodeId('os', layer.id), nodeId('tech', t));
}

for (const service of services) {
  for (const l of service.osLayers) add(nodeId('svc', service.id), nodeId('os', l));
  for (const a of service.accelerators) add(nodeId('svc', service.id), nodeId('acc', a));
  for (const g of groupsForService(service.id)) add(nodeId('svc', service.id), nodeId('grp', g));
}

for (const domain of controlDomains) {
  add(nodeId('ctl', domain.id), nodeId('svc', 's03'));
  add(nodeId('ctl', domain.id), nodeId('grp', 'control'));
  for (const a of domain.accelerators) add(nodeId('ctl', domain.id), nodeId('acc', a));
}

for (const acc of accelerators) {
  for (const g of capabilityGroups) {
    if (g.capabilities.some((c) => acc.capabilities.includes(c.id))) add(nodeId('acc', acc.id), nodeId('grp', g.id));
  }
  for (const t of acc.tech) add(nodeId('acc', acc.id), nodeId('tech', t));
}

const adjacency = new Map<string, Set<string>>();
for (const [a, b] of edges) {
  if (!adjacency.has(a)) adjacency.set(a, new Set());
  if (!adjacency.has(b)) adjacency.set(b, new Set());
  adjacency.get(a)!.add(b);
  adjacency.get(b)!.add(a);
}

export function neighbours(id: string): Set<string> {
  return adjacency.get(id) ?? new Set();
}
