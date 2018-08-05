import path from 'path';
import crypto from 'crypto';
import MD5 from 'md5.js';
import pEachSeries from 'p-each-series';
import micromatch from 'micromatch';
// const chalk = require('chalk')
import chalk from 'chalk';

// 确保最后的斜线
function ensureTrailingSlash(string) {
  if (string.length && string.substr(-1, 1) !== '/') {
    return `${string}/`;
  }

  return string;
}

// Copied from html-webpack-plugin
function resolvePublicPath(compilation, filename) {
  /* istanbul ignore else */
  const publicPath =
    typeof compilation.options.output.publicPath !== 'undefined'
      ? compilation.options.output.publicPath
      : path.relative(path.dirname(filename), '.'); // TODO: How to test this? I haven't written this logic, unsure what it does

  return ensureTrailingSlash(publicPath);
}

function resolveOutput(compilation, addedFilename, outputPath) {
  console.log(chalk.green('resolveOutput--->'));
  console.log(chalk.green(`${addedFilename} | ${outputPath}`));
  if (outputPath && outputPath.length) {
    /* eslint-disable no-param-reassign */
    compilation.assets[`${outputPath}/${addedFilename}`] =
      compilation.assets[addedFilename];
    // 删除统一添加的asset
    delete compilation.assets[addedFilename];
    /* eslint-enable */
  }
}

function getBaseName(filename, compilation) {
  filename = path.resolve(compilation.compiler.context, filename);
  const basename = path.basename(filename);
  return basename;
}

function addJsAndCssToHtmlAsset(
  htmlPluginData,
  typeOfAsset,
  resolvedPath,
  beDependent,
) {
  let operator = 'push';
  if (typeOfAsset === 'js' && beDependent === true) {
    operator = 'unshift';
  }
  htmlPluginData.assets[typeOfAsset][operator](resolvedPath);
}

async function addFileToAssets(
  compilation,
  htmlPluginData,
  {
    filepath,
    typeOfAsset = 'js',
    includeSourcemap = true,
    hash = false,
    publicPath,
    outputPath,
    files = [],
    beDependent = true, // js是否被依赖 类似jquery， 仅js有效
    isEmit = true, // 是否输出文件
  },
) {
  if (!filepath) {
    const error = new Error('No filepath defined');
    compilation.errors.push(error);
    return Promise.reject(error);
  }

  const fileFilters = Array.isArray(files) ? files : [files];

  if (fileFilters.length > 0) {
    const shouldSkip = !fileFilters.some(file =>
      micromatch.isMatch(htmlPluginData.outputName, file),
    );

    if (shouldSkip) {
      return Promise.resolve(null);
    }
  }
  // 是否输出文件到compilation.assets
  let suffix = '';
  const addedFilename = isEmit
    ? await htmlPluginData.plugin.addFileToAssets(filepath, compilation)
    : getBaseName(filepath, compilation);

  if (hash && isEmit) {
    const md5 = crypto.createHash('md5');
    md5.update(compilation.assets[addedFilename].source());
    suffix = `?${md5.digest('hex').substr(0, 20)}`;
  } else if (hash && !isEmit) {
    suffix = new MD5()
      .update((Math.random() * 100).toFixed(5).toString())
      .digest('hex');
  }

  const resolvedPublicPath =
    typeof publicPath === 'undefined'
      ? resolvePublicPath(compilation, addedFilename)
      : ensureTrailingSlash(publicPath);
  const resolvedPath = `${resolvedPublicPath}${addedFilename}${suffix}`;
  // 添加连接到html
  addJsAndCssToHtmlAsset(
    htmlPluginData,
    typeOfAsset,
    resolvedPath,
    beDependent,
  );
  // 自定义输出文件目录
  resolveOutput(compilation, addedFilename, outputPath);

  if (includeSourcemap) {
    const addedMapFilename = await htmlPluginData.plugin.addFileToAssets(
      `${filepath}.map`,
      compilation,
    );
    resolveOutput(compilation, addedMapFilename, outputPath);
  }

  return Promise.resolve(null);
}

// Visible for testing
async function addAssets(assets, compilation, htmlPluginData, callback) {
  try {
    // 暂不支持glob
    // const handledAssets = await handleUrl(assets);
    const handledAssets = assets;

    await pEachSeries(handledAssets, asset =>
      addFileToAssets(compilation, htmlPluginData, asset),
    );
    if (callback) {
      return callback(null, htmlPluginData);
    }
    return htmlPluginData;
  } catch (e) {
    if (callback) {
      return callback(e, htmlPluginData);
    }
    throw e;
  }
}

module.exports = addAssets;
