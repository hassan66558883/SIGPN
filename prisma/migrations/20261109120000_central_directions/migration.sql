-- Security audit, lot 2: the central directions and units of the DGPN (decree 0572/PT/PM/MSPI/2023, articles 24 to 42)
-- are national units, neither a province's commissariat nor a post. Additive: a new value of the existing enum.
ALTER TYPE "StationType" ADD VALUE IF NOT EXISTS 'CENTRAL_DIRECTION';
