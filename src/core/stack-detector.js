const fs = require('fs-extra');
const path = require('path');

function sanitize(value, maxLen = 100) {
  if (!value) return '';
  return value
    .replace(/[\x00-\x09\x0B-\x1F]/g, '')
    .replace(/`/g, '')
    .replace(/\$\([^)]*\)/g, '')
    .replace(/\$\{[^}]*\}/g, '')
    .replace(/<!--[^>]*-->/g, '')
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/[<>]/g, '')
    .slice(0, maxLen)
    .trim();
}

async function findFiles(dir, extensions, maxDepth = 2) {
  const results = [];

  async function walk(current, depth) {
    if (depth > maxDepth) return;
    try {
      const entries = await fs.readdir(current, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'vendor') continue;
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) {
          await walk(full, depth + 1);
        } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
          results.push(full);
        }
      }
    } catch {
      // directorio inaccesible
    }
  }

  await walk(dir, 0);
  return results;
}

function readJsonSafe(filePath) {
  try {
    return fs.readJsonSync(filePath);
  } catch {
    return null;
  }
}

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function extractVersion(content, pattern) {
  const match = content.match(pattern);
  return match ? match[1] : '';
}

async function detect(repoPath) {
  const abs = path.resolve(repoPath);
  let primaryTech = '';
  let framework = '';
  let verifyCommands = '';
  const stackParts = [];

  // --- JS/TS: package.json ---
  const pkgPath = path.join(abs, 'package.json');
  if (await fs.pathExists(pkgPath)) {
    const pkg = readJsonSafe(pkgPath);
    if (pkg) {
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (deps['@angular/core']) {
        const ver = (deps['@angular/core'] || '').replace(/[~^]/g, '').split('.')[0];
        primaryTech = 'TypeScript';
        framework = `Angular ${ver}`;
        verifyCommands = 'ng build, ng test, ng lint';
        stackParts.push(`Angular ${ver}`);
      } else if (deps.next) {
        primaryTech = 'TypeScript/JS';
        framework = 'Next.js';
        verifyCommands = 'npm run build, npm run lint';
        stackParts.push('Next.js');
      } else if (deps.react) {
        primaryTech = 'TypeScript/JS';
        framework = 'React';
        verifyCommands = 'npm run build, npm test';
        stackParts.push('React');
      } else if (deps.vue) {
        primaryTech = 'TypeScript/JS';
        framework = 'Vue.js';
        verifyCommands = 'npm run build, npm test';
        stackParts.push('Vue.js');
      } else if (deps.svelte) {
        primaryTech = 'TypeScript/JS';
        framework = 'Svelte';
        verifyCommands = 'npm run build, npm run check';
        stackParts.push('Svelte');
      } else if (deps.nuxt) {
        primaryTech = 'TypeScript/JS';
        framework = 'Nuxt';
        verifyCommands = 'npm run build, npm run lint';
        stackParts.push('Nuxt');
      } else if (deps.express || deps.fastify || deps.koa || deps.hono) {
        primaryTech = 'TypeScript/JS';
        framework = 'Node.js';
        verifyCommands = 'npm run build, npm test';
        stackParts.push('Node.js');
      }
    }
  }

  // --- Java: pom.xml (Maven) ---
  const pomPath = path.join(abs, 'pom.xml');
  if (await fs.pathExists(pomPath)) {
    const pom = readFileSafe(pomPath);

    if (pom.includes('spring-boot-starter')) {
      const sbVersion = extractVersion(pom, /spring-boot-starter-parent[\s\S]*?<version>([\d.]+)<\/version>/);
      const javaVersion =
        extractVersion(pom, /<java\.version>([\d.]+)<\/java\.version>/) ||
        extractVersion(pom, /<maven\.compiler\.source>([\d.]+)<\/maven\.compiler\.source>/);

      primaryTech = javaVersion ? `Java ${javaVersion}` : 'Java';
      framework = sbVersion ? `Spring Boot ${sbVersion} + Maven` : 'Spring Boot + Maven';
      verifyCommands = 'mvn compile, mvn test, mvn verify';
      stackParts.push(sbVersion ? `Spring Boot ${sbVersion}` : 'Spring Boot');
      stackParts.push('Maven');
      if (javaVersion) stackParts.push(`Java ${javaVersion}`);

      if (pom.includes('spring-boot-starter-data-jpa')) stackParts.push('JPA');
      if (pom.includes('spring-cloud-starter-openfeign')) stackParts.push('Feign');
      if (pom.includes('postgresql')) stackParts.push('PostgreSQL');
      if (pom.includes('mysql-connector')) stackParts.push('MySQL');
      if (pom.includes('spring-boot-starter-data-mongodb')) stackParts.push('MongoDB');
    }
  }

  // --- Java/Kotlin: build.gradle(.kts) ---
  if (!primaryTech) {
    const gradleKts = path.join(abs, 'build.gradle.kts');
    const gradleGroovy = path.join(abs, 'build.gradle');
    const gradlePath = (await fs.pathExists(gradleKts)) ? gradleKts : (await fs.pathExists(gradleGroovy)) ? gradleGroovy : null;

    if (gradlePath) {
      const gradle = readFileSafe(gradlePath);
      if (gradle.includes('org.springframework.boot')) {
        primaryTech = gradlePath.endsWith('.kts') ? 'Kotlin' : 'Java/Kotlin';
        framework = 'Spring Boot + Gradle';
        verifyCommands = 'gradle build, gradle test';
        stackParts.push('Spring Boot', 'Gradle');
      }
    }
  }

  // --- Python ---
  if (!primaryTech) {
    const pyprojectPath = path.join(abs, 'pyproject.toml');
    const reqsPath = path.join(abs, 'requirements.txt');
    let pyContent = '';

    if (await fs.pathExists(pyprojectPath)) {
      pyContent = readFileSafe(pyprojectPath);
    } else if (await fs.pathExists(reqsPath)) {
      pyContent = readFileSafe(reqsPath);
    }

    if (pyContent) {
      const lower = pyContent.toLowerCase();
      if (lower.includes('django')) {
        primaryTech = 'Python';
        framework = 'Django';
        verifyCommands = 'python manage.py test';
        stackParts.push('Django');
      } else if (lower.includes('fastapi')) {
        primaryTech = 'Python';
        framework = 'FastAPI';
        verifyCommands = 'pytest';
        stackParts.push('FastAPI');
      } else if (lower.includes('flask')) {
        primaryTech = 'Python';
        framework = 'Flask';
        verifyCommands = 'pytest';
        stackParts.push('Flask');
      } else {
        primaryTech = 'Python';
        verifyCommands = 'pytest';
        stackParts.push('Python');
      }
    }
  }

  // --- Go ---
  if (!primaryTech) {
    const goModPath = path.join(abs, 'go.mod');
    if (await fs.pathExists(goModPath)) {
      const goMod = readFileSafe(goModPath);
      const goVer = extractVersion(goMod, /^go\s+([\d.]+)/m);
      primaryTech = goVer ? `Go ${goVer}` : 'Go';
      verifyCommands = 'go build ./..., go test ./...';
      stackParts.push(primaryTech);
    }
  }

  // --- Rust ---
  if (!primaryTech) {
    const cargoPath = path.join(abs, 'Cargo.toml');
    if (await fs.pathExists(cargoPath)) {
      primaryTech = 'Rust';
      verifyCommands = 'cargo build, cargo test';
      stackParts.push('Rust');
    }
  }

  // --- Dart / Flutter ---
  if (!primaryTech) {
    const pubspecPath = path.join(abs, 'pubspec.yaml');
    if (await fs.pathExists(pubspecPath)) {
      const pubspec = readFileSafe(pubspecPath);
      if (pubspec.includes('flutter')) {
        primaryTech = 'Dart';
        framework = 'Flutter';
        verifyCommands = 'flutter analyze, flutter test';
        stackParts.push('Flutter');
      } else {
        primaryTech = 'Dart';
        verifyCommands = 'dart analyze, dart test';
        stackParts.push('Dart');
      }
    }
  }

  // --- .NET ---
  if (!primaryTech) {
    const csprojFiles = await findFiles(abs, ['.csproj'], 1);
    if (csprojFiles.length > 0) {
      primaryTech = 'C#';
      framework = '.NET';
      verifyCommands = 'dotnet build, dotnet test';
      stackParts.push('.NET');
    }
  }

  // --- Ruby ---
  if (!primaryTech) {
    const gemfilePath = path.join(abs, 'Gemfile');
    if (await fs.pathExists(gemfilePath)) {
      const gemfile = readFileSafe(gemfilePath);
      primaryTech = 'Ruby';
      if (gemfile.includes('rails')) {
        framework = 'Rails';
        verifyCommands = 'rails test';
        stackParts.push('Rails');
      } else if (gemfile.includes('sinatra')) {
        framework = 'Sinatra';
        verifyCommands = 'ruby test/';
        stackParts.push('Sinatra');
      } else {
        verifyCommands = 'ruby -c';
        stackParts.push('Ruby');
      }
    }
  }

  // --- Supplementary ---
  if (await fs.pathExists(path.join(abs, 'tsconfig.json'))) {
    if (!stackParts.includes('TypeScript') && primaryTech !== 'TypeScript') {
      stackParts.push('TypeScript');
    }
  }

  const hasSCSS =
    (await findFiles(abs, ['.scss'], 2)).length > 0;
  if (hasSCSS) stackParts.push('SCSS');

  const tailwindFiles = await findFiles(abs, ['tailwind.config.js', 'tailwind.config.ts', 'tailwind.config.mjs'], 1);
  if (tailwindFiles.length > 0) stackParts.push('Tailwind CSS');

  if (await fs.pathExists(pkgPath)) {
    const pkgRaw = readFileSafe(pkgPath);
    if (pkgRaw.includes('"bootstrap"')) stackParts.push('Bootstrap');
    if (pkgRaw.includes('"@angular/material"')) stackParts.push('Angular Material');
  }

  if (await fs.pathExists(path.join(abs, 'Dockerfile'))) {
    stackParts.push('Docker');
  }

  if (await fs.pathExists(path.join(abs, 'docker-compose.yml')) || await fs.pathExists(path.join(abs, 'docker-compose.yaml'))) {
    if (!stackParts.includes('Docker')) stackParts.push('Docker');
    stackParts.push('Docker Compose');
  }

  // --- Fallback ---
  if (!primaryTech) {
    primaryTech = 'Generic';
  }

  const stackCsv = stackParts.length > 0 ? stackParts.map((p) => sanitize(p, 50)).join(', ') : sanitize(primaryTech, 50);

  return {
    primaryTech: sanitize(primaryTech, 50),
    framework: sanitize(framework, 100),
    verifyCommands: sanitize(verifyCommands, 200),
    stackParts: stackParts.map((p) => sanitize(p, 50)),
    stackCsv,
  };
}

function deriveAlias(repoPath) {
  return path.basename(repoPath).replace(/[_.]/g, '-').slice(0, 30);
}

module.exports = { detect, deriveAlias, sanitize, findFiles };
