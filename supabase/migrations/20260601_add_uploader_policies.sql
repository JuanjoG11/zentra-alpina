-- Migration: añadir políticas para rol 'uploader'
-- Permite INSERT en tabla de staging `sales_staging` y en `storage.objects`

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='sales_staging') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sales_staging' AND policyname='allow_uploaders_insert_sales_staging'
    ) THEN
      EXECUTE '
        CREATE POLICY allow_uploaders_insert_sales_staging
        ON public.sales_staging
        FOR INSERT
        USING ((current_setting(''jwt.claims'')::json ->> ''role'') = ''uploader'')
      ';
    END IF;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='storage' AND tablename='objects') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='allow_uploaders_insert_storage_objects'
    ) THEN
      EXECUTE '
        CREATE POLICY allow_uploaders_insert_storage_objects
        ON storage.objects
        FOR INSERT
        USING ((current_setting(''jwt.claims'')::json ->> ''role'') = ''uploader'')
      ';
    END IF;
  END IF;
END
$$;
