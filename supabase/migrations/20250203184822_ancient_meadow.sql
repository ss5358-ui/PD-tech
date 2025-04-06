/*
  # Initial CRM Schema Setup

  1. New Tables
    - `employees`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `full_name` (text)
      - `role` (text) - either 'head' or 'employee'
      - `created_at` (timestamp)
    
    - `clients`
      - `id` (uuid, primary key)
      - `name` (text)
      - `company` (text)
      - `address` (text)
      - `created_by` (uuid, references employees)
      - `created_at` (timestamp)
    
    - `contact_persons`
      - `id` (uuid, primary key)
      - `client_id` (uuid, references clients)
      - `name` (text)
      - `position` (text)
      - `email` (text)
      - `phone` (text)
    
    - `client_assignments`
      - `id` (uuid, primary key)
      - `client_id` (uuid, references clients)
      - `employee_id` (uuid, references employees)
      - `assigned_at` (timestamp)
    
    - `quotations`
      - `id` (uuid, primary key)
      - `client_id` (uuid, references clients)
      - `employee_id` (uuid, references employees)
      - `amount` (numeric)
      - `description` (text)
      - `status` (text) - 'pending', 'approved', 'rejected'
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for head and employee access
*/

-- Create employees table
CREATE TABLE employees (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('head', 'employee')),
  created_at timestamptz DEFAULT now()
);

-- Create clients table
CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company text NOT NULL,
  address text,
  created_by uuid REFERENCES employees(id),
  created_at timestamptz DEFAULT now()
);

-- Create contact_persons table
CREATE TABLE contact_persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  position text,
  email text,
  phone text,
  created_at timestamptz DEFAULT now()
);

-- Create client_assignments table
CREATE TABLE client_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(client_id, employee_id)
);

-- Create quotations table
CREATE TABLE quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employees(id),
  amount numeric NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;

-- Policies for employees table
CREATE POLICY "Employees can view their own data"
  ON employees
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Head can view all employees"
  ON employees
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM employees WHERE id = auth.uid() AND role = 'head'
  ));

CREATE POLICY "Head can manage employees"
  ON employees
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM employees WHERE id = auth.uid() AND role = 'head'
  ));

-- Policies for clients table
CREATE POLICY "Employees can view assigned clients"
  ON clients
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM client_assignments
      WHERE client_id = clients.id
      AND employee_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM employees
      WHERE id = auth.uid() AND role = 'head'
    )
  );

CREATE POLICY "Employees can create clients"
  ON clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE id = auth.uid()
    )
  );

-- Policies for contact_persons table
CREATE POLICY "Access contact persons through client access"
  ON contact_persons
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE id = contact_persons.client_id
      AND (
        EXISTS (
          SELECT 1 FROM client_assignments
          WHERE client_id = clients.id
          AND employee_id = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1 FROM employees
          WHERE id = auth.uid() AND role = 'head'
        )
      )
    )
  );

-- Policies for client_assignments table
CREATE POLICY "Head can manage assignments"
  ON client_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE id = auth.uid() AND role = 'head'
    )
  );

CREATE POLICY "Employees can view their assignments"
  ON client_assignments
  FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

-- Policies for quotations table
CREATE POLICY "Employees can manage their quotations"
  ON quotations
  FOR ALL
  TO authenticated
  USING (
    employee_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM employees
      WHERE id = auth.uid() AND role = 'head'
    )
  );