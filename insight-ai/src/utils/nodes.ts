import { acceleratorById } from '../data/accelerators';
import { capabilityGroupById } from '../data/capabilities';
import { controlDomainById } from '../data/control';
import { osLayerById } from '../data/operatingSystem';
import type { NodeKind } from '../data/relationships';
import { sectorById } from '../data/sectors';
import { serviceById } from '../data/services';
import { techById } from '../data/technology';
import type {
  AcceleratorId,
  ArchitectureLayerId,
  CapabilityGroupId,
  ControlDomainId,
  OsLayerId,
  SectorId,
  ServiceId,
  TechId,
} from '../data/types';
import type { StyleKey } from './categoryStyle';

export function parseNode(id: string) {
  const [kind, key] = id.split(':') as [NodeKind, string];
  return { kind, key };
}

export const kindToLayer: Record<NodeKind, ArchitectureLayerId> = {
  sector: 'plays',
  os: 'os',
  ctl: 'control',
  svc: 'services',
  grp: 'capabilities',
  acc: 'accelerators',
  tech: 'foundations',
};

export const kindToStyle: Record<NodeKind, StyleKey> = {
  sector: 'industry',
  os: 'architecture',
  ctl: 'control',
  svc: 'service',
  grp: 'capability',
  acc: 'accelerator',
  tech: 'technology',
};

export const kindLabel: Record<NodeKind, string> = {
  sector: 'Industry overlays',
  os: 'Operating system layers',
  ctl: 'Control domains',
  svc: 'Service offerings',
  grp: 'Capability groups',
  acc: 'Accelerators / IP',
  tech: 'Technology foundations',
};

/** Human-readable name for any graph node. */
export function nodeName(id: string): string {
  const { kind, key } = parseNode(id);
  switch (kind) {
    case 'sector':
      return sectorById[key as SectorId].name;
    case 'os':
      return osLayerById[key as OsLayerId].name;
    case 'ctl':
      return controlDomainById[key as ControlDomainId].name;
    case 'svc':
      return `S${serviceById[key as ServiceId].number} ${serviceById[key as ServiceId].shortName}`;
    case 'grp':
      return capabilityGroupById[key as CapabilityGroupId].name;
    case 'acc':
      return acceleratorById[key as AcceleratorId].name;
    case 'tech':
      return techById[key as TechId].name;
  }
}
