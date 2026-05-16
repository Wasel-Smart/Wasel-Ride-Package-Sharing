DO 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trips' AND column_name = 'departure_date') THEN
        ALTER TABLE trips ADD COLUMN departure_date DATE DEFAULT CURRENT_DATE;
        ALTER TABLE trips ALTER COLUMN departure_date SET NOT NULL;
    END IF;
END ;

CREATE INDEX IF NOT EXISTS idx_trips_departure_date ON trips(departure_date);
