CREATE TRIGGER "OptionTemplate_global_name_on_insert"
BEFORE INSERT ON "OptionTemplate"
WHEN EXISTS (SELECT 1 FROM "OptionTemplate" WHERE lower(trim(name)) = lower(trim(NEW.name)))
  OR EXISTS (SELECT 1 FROM "OptionTemplateGroup" WHERE lower(trim(name)) = lower(trim(NEW.name)))
BEGIN SELECT RAISE(ABORT, 'catalog name already exists'); END;

CREATE TRIGGER "OptionTemplate_global_name_on_update"
BEFORE UPDATE OF name ON "OptionTemplate"
WHEN EXISTS (SELECT 1 FROM "OptionTemplate" WHERE lower(trim(name)) = lower(trim(NEW.name)) AND id <> NEW.id)
  OR EXISTS (SELECT 1 FROM "OptionTemplateGroup" WHERE lower(trim(name)) = lower(trim(NEW.name)))
BEGIN SELECT RAISE(ABORT, 'catalog name already exists'); END;

CREATE TRIGGER "OptionTemplateGroup_global_name_on_insert"
BEFORE INSERT ON "OptionTemplateGroup"
WHEN EXISTS (SELECT 1 FROM "OptionTemplate" WHERE lower(trim(name)) = lower(trim(NEW.name)))
  OR EXISTS (SELECT 1 FROM "OptionTemplateGroup" WHERE lower(trim(name)) = lower(trim(NEW.name)))
BEGIN SELECT RAISE(ABORT, 'catalog name already exists'); END;

CREATE TRIGGER "OptionTemplateGroup_global_name_on_update"
BEFORE UPDATE OF name ON "OptionTemplateGroup"
WHEN EXISTS (SELECT 1 FROM "OptionTemplate" WHERE lower(trim(name)) = lower(trim(NEW.name)))
  OR EXISTS (SELECT 1 FROM "OptionTemplateGroup" WHERE lower(trim(name)) = lower(trim(NEW.name)) AND id <> NEW.id)
BEGIN SELECT RAISE(ABORT, 'catalog name already exists'); END;
