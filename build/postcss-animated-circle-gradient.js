function splitBalancedArgs(str) {
  const args = [];
  let current = '';
  let depth = 0;

  for (let char of str) {
    if (char === '(') depth++;
    if (char === ')') depth--;

    if (char === ',' && depth === 0) {
      args.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) args.push(current.trim());

  return args;
}

function generatePercentSteps(steps) {
  const result = [];
  for (let i = 0; i <= steps; i++) {
    const percent = +(i * 100 / steps).toFixed(2).replace(/\.?0+$/, '');
    result.push(percent);
  }
  return result;
}

function generateKeyframes(name, colors, thickness, inverted) {
  const percentageSteps = generatePercentSteps(colors.length);
  const startValue = inverted ? thickness : '0';
  const endValue = inverted ? '0' : thickness;
  const steps = percentageSteps.map((percentage, index) => {
    const isLastStep = index === percentageSteps.length - 1;

    const properties = colors.reduce((acc, color, i) => {
      const propName = `--stripe-width-${i + 1}`;
      const isFirstColor = i === 0;

      let value;

      if (!isLastStep) {
        value = index === i  ? startValue : endValue;
      } else {
        value = isFirstColor ? startValue : endValue;
      }

      return {
        ...acc,
        [propName]: value
      };
    }, {});

    return {
      percentage,
      properties,
    };
  });

  const finalSteps = [];

  steps.forEach((step, i) => {
    finalSteps.push({
      key: `${step.percentage}%`,
      value: step.properties,
    });

    const nextStep = steps[i + 1];

    if (!nextStep) return;

    finalSteps.push({
      key: `${+(step.percentage + 0.01).toFixed(2)}%, ${nextStep.percentage}%`,
      value: colors.reduce((acc, color, j) => {
        return {
          ...acc,
          [`--clr-${j + 1}-opacity`]: step.properties[`--stripe-width-${j + 1}`] === startValue ? '1' : '0',
        };
      }, {}),
    })
  });

  const keyframes = [`@keyframes ${name}-animation {`];

  finalSteps.forEach(({ key, value }) => {
    keyframes.push(`  ${key} {\n ${Object.entries(value).map(([prop, val]) => `${prop}: ${val};\n`).join('')} }`);
  });

  keyframes.push('}');

  return keyframes.join('\n');
}

module.exports = () => {
  return {
    postcssPlugin: 'postcss-animated-circle-gradient',

    AtRule: {
      'animated-circle-gradient': (atRule) => {
        const name = atRule.params.trim();
        const nodes = atRule.nodes || [];

        let thickness = '15px';
        let colors = [];
        let speed = '5s';
        let inverted = false;
        let selectors = {
          base: `.${name}`,
          animated: null
        };

        const parseSelectorMap = (str) => {
          const entries = str
            .replace(/^\(|\)$/g, '')
            .split(',')
            .map(line => line.trim())
            .filter(Boolean)
            .map(line => {
              const match = line.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.+)$/);
              if (!match) throw new Error(`Invalid selector line: "${line}"`);
              const [, key, val] = match;
              return [key, val];
            });

          return Object.fromEntries(entries);
        };

        for (const node of nodes) {
          if (node.prop === 'inverted') {
            inverted = node.value.trim() === 'true';
          }

          if (node.prop === 'thickness') {
            thickness = node.value.trim();
          }

          if (node.prop === 'colors') {
            const raw = node.value.trim();
            const inner = raw.startsWith('(') && raw.endsWith(')')
              ? raw.slice(1, -1).trim()
              : raw;

            colors = splitBalancedArgs(inner);
          }

          if (node.prop === 'speed') {
            speed = node.value.trim();
          }

          if (node.prop === 'selectors') {
            const parsed = parseSelectorMap(node.value);
            selectors.base = parsed.base || selectors.base;
            selectors.animated = parsed.animated || null;
          }
        }

        const customPropertiesRegistration = colors.map((color, i) => {
          return [
            `@property --stripe-width-${i + 1} {`,
            '  syntax: "<length>";',
            '  inherits: false;',
            `  initial-value: 0;`,
            '}',
          ];
        }).flat().join('\n');

        const keyframes = generateKeyframes(name, colors, thickness, inverted);

        const repeatingRadialGradients = colors.map((color, i) => {
          const gradientIndex = i + 1;
          const currentColorIndex = inverted ? i + 1 : -i + 1;
          const currentColors = [...colors.slice(currentColorIndex), ...colors.slice(0, currentColorIndex)];

          let rule = `repeating-radial-gradient(circle, `;

          const currentColorStops = [];

          currentColors.forEach((c, j) => {
            const stopIndex = j + 1;
            currentColorStops.push(
              `
                color-mix(in srgb, ${c} var(--opacity-${gradientIndex}), transparent)
                calc(var(--stripe-width-${gradientIndex}) + var(--thickness) * ${stopIndex - 1})
              `
            );
            currentColorStops.push(
              `
                color-mix(in srgb, ${c} var(--opacity-${gradientIndex}), transparent)
                calc(var(--stripe-width-${gradientIndex}) + var(--thickness) * ${stopIndex})
              `
            );
          });

          rule += currentColorStops.join(', ') + ')';

          return rule;
        });

        const baseVars = colors.map((_, i) => `
          --stripe-width-${i + 1}: ${i === 0 ? 'var(--thickness)' : '0px'};
          --clr-${i + 1}-opacity: ${i === 0 ? 1 : 0};
          --opacity-${i + 1}: calc(var(--clr-${i + 1}-opacity) * 100%);
        `).join('\n  ');

        const baseBlock = [
          `${selectors.base} {`,
          `  --thickness: ${thickness};`,
          `  ${baseVars}`,
          `  background-image: ${repeatingRadialGradients.join(', ')};`,
          `  background-position: center center;`,
          `}`,
        ].join('\n');

        const animatedBlock = selectors.animated
          ? `${selectors.animated} { animation: ${name}-animation ${speed} linear infinite; }`
          : `${selectors.base} { animation: ${name}-animation ${speed} linear infinite; }`;

        const css = [
          customPropertiesRegistration,
          keyframes,
          baseBlock,
          animatedBlock
        ].join('\n\n');

        atRule.replaceWith(css);
      }
    }
  };
};

module.exports.postcss = true;
