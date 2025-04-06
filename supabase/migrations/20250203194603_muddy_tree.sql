/*
  # Add Assets and Site Visits Tables

  1. New Tables
    - `assets`
      - `id` (uuid, primary key)
      - `item` (text)
      - `created_at` (timestamp)
    
    - `site_visits`
      - `id` (uuid, primary key)
      - `employee_id` (uuid, references employees)
      - `client_id` (uuid, references clients)
      - `address` (text)
      - `notes` (text)
      - `exit_location` (text)
      - `created_at` (timestamp)
    
    - `site_visit_assets`
      - `id` (uuid, primary key)
      - `site_visit_id` (uuid, references site_visits)
      - `asset_id` (uuid, references assets)
      - `quantity` (integer)
    
    - `quotation_assets`
      - `id` (uuid, primary key)
      - `quotation_id` (uuid, references quotations)
      - `asset_id` (uuid, references assets)
      - `quantity` (integer)

  2. Security
    - Enable RLS on all tables
    - Add policies for head and employee access
*/

-- Create assets table
CREATE TABLE assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create site_visits table
CREATE TABLE site_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id),
  client_id uuid REFERENCES clients(id),
  address text NOT NULL,
  notes text,
  exit_location text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create site_visit_assets table
CREATE TABLE site_visit_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_visit_id uuid REFERENCES site_visits(id) ON DELETE CASCADE,
  asset_id uuid REFERENCES assets(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz DEFAULT now()
);

-- Create quotation_assets table
CREATE TABLE quotation_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid REFERENCES quotations(id) ON DELETE CASCADE,
  asset_id uuid REFERENCES assets(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz DEFAULT now()
);

-- Add start_date and end_date to quotations table
ALTER TABLE quotations 
ADD COLUMN start_date date NOT NULL,
ADD COLUMN end_date date NOT NULL;

-- Enable RLS
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_visit_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_assets ENABLE ROW LEVEL SECURITY;

-- Policies for assets table
CREATE POLICY "Everyone can view assets"
  ON assets
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Head can manage assets"
  ON assets
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM employees WHERE id = auth.uid() AND role = 'head'
  ));

-- Policies for site_visits table
CREATE POLICY "Employees can create and view their site visits"
  ON site_visits
  FOR ALL
  TO authenticated
  USING (
    employee_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM employees WHERE id = auth.uid() AND role = 'head'
    )
  );

-- Policies for site_visit_assets table
CREATE POLICY "Access site visit assets through site visit access"
  ON site_visit_assets
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM site_visits
      WHERE id = site_visit_assets.site_visit_id
      AND (
        employee_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM employees WHERE id = auth.uid() AND role = 'head'
        )
      )
    )
  );

-- Policies for quotation_assets table
CREATE POLICY "Access quotation assets through quotation access"
  ON quotation_assets
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotations
      WHERE id = quotation_assets.quotation_id
      AND (
        employee_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM employees WHERE id = auth.uid() AND role = 'head'
        )
      )
    )
  );