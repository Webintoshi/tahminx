import { CanonicalMappingService } from './canonical-mapping.service';

describe('CanonicalMappingService', () => {
  it('maps to existing team by high similarity', async () => {
    const prismaMock = {
      providerTeamMapping: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({}),
      },
      team: {
        findMany: jest.fn().mockResolvedValue([{ id: 't1', name: 'Arsenal FC', shortName: 'ARS', country: 'England' }]),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 't-new' }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({}),
      },
      league: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn() },
      providerLeagueMapping: { findUnique: jest.fn(), upsert: jest.fn() },
      providerMatchMapping: { findUnique: jest.fn(), upsert: jest.fn() },
      match: { findMany: jest.fn(), create: jest.fn().mockResolvedValue({ id: 't-new' }), update: jest.fn() },
      season: { upsert: jest.fn() },
    } as any;

    const service = new CanonicalMappingService(prismaMock);

    const result = await service.resolveTeam({
      providerId: 'p1',
      sportId: 's1',
      externalId: '57',
      externalName: 'Arsenal FC',
      shortName: 'ARS',
      country: 'England',
    });

    expect(result).toBe('t1');
    expect(prismaMock.providerTeamMapping.upsert).toHaveBeenCalled();
  });

  it('creates new team when no candidate exists', async () => {
    const prismaMock = {
      providerTeamMapping: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({}),
      },
      team: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 't2' }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({}),
      },
      league: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn() },
      providerLeagueMapping: { findUnique: jest.fn(), upsert: jest.fn() },
      providerMatchMapping: { findUnique: jest.fn(), upsert: jest.fn() },
      match: { findMany: jest.fn(), create: jest.fn().mockResolvedValue({ id: 't-new' }), update: jest.fn() },
      season: { upsert: jest.fn() },
    } as any;

    const service = new CanonicalMappingService(prismaMock);

    const result = await service.resolveTeam({
      providerId: 'p1',
      sportId: 's1',
      externalId: '999',
      externalName: 'New Team',
    });

    expect(result).toBe('t2');
    expect(prismaMock.team.create).toHaveBeenCalled();
  });
});

