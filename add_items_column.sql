-- Run this SQL in your Supabase SQL Editor to add the missing items column to the orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]'::jsonb;
