package com.vaadin.hilla.engine;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import javax.annotation.Nonnull;

import com.vaadin.hilla.engine.commandrunner.CommandNotFoundException;
import com.vaadin.hilla.engine.commandrunner.CommandRunnerException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class GeneratorProcessor {
    private static final Logger logger = LoggerFactory
            .getLogger(GeneratorProcessor.class);

    private static final Path TSGEN_PATH = Paths.get("node_modules", "@vaadin",
            "hilla-generator-cli", "bin", "index.js");
    private final Path baseDir;
    private final String nodeCommand;
    private final Path openAPIFile;
    private final Path outputDirectory;
    private final GeneratorConfiguration.PluginsProcessor pluginsProcessor = new GeneratorConfiguration.PluginsProcessor();

    public GeneratorProcessor(EngineConfiguration conf, String nodeCommand,
            boolean isProductionMode) {
        this.baseDir = conf.getBaseDir();
        this.openAPIFile = conf.getOpenAPIFile(isProductionMode);
        this.outputDirectory = conf.getOutputDir();
        this.nodeCommand = nodeCommand;
        applyConfiguration(conf.getGenerator());
    }

    public void process() throws GeneratorException {
        var arguments = new ArrayList<>();
        arguments.add(TSGEN_PATH);
        prepareOutputDir(arguments);
        preparePlugins(arguments);
        prepareVerbose(arguments);

        try {
            var runner = new GeneratorShellRunner(baseDir.toFile(), nodeCommand,
                    arguments.stream().map(Objects::toString)
                            .toArray(String[]::new));
            runner.run((stdIn) -> {
                try {
                    Files.copy(openAPIFile, stdIn);
                } catch (IOException e) {
                    throw new LambdaException(e);
                }
            });
        } catch (LambdaException e) {
            throw new GeneratorException("Node execution failed", e.getCause());
        } catch (CommandNotFoundException e) {
            throw new GeneratorException("Node command not found", e);
        } catch (CommandRunnerException e) {
            throw new GeneratorException("Node execution failed", e);
        }
    }

    // Used to catch a checked exception in a lambda and handle it after
    private static class LambdaException extends RuntimeException {
        public LambdaException(Throwable cause) {
            super(cause);
        }
    }

    private GeneratorProcessor applyConfiguration(
            GeneratorConfiguration generatorConfiguration) {
        if (generatorConfiguration == null) {
            return this;
        }

        generatorConfiguration.getPlugins().ifPresent(this::applyPlugins);
        return this;
    }

    private void applyPlugins(@Nonnull GeneratorConfiguration.Plugins plugins) {
        pluginsProcessor.setConfig(plugins);
    }

    private void prepareOutputDir(List<Object> arguments) {
        var result = outputDirectory.isAbsolute() ? outputDirectory
                : baseDir.resolve(outputDirectory);
        arguments.add("-o");
        arguments.add(result);
    }

    private void preparePlugins(List<Object> arguments) {
        pluginsProcessor.process().stream()
                .map(GeneratorConfiguration.Plugin::getPath).distinct()
                .forEachOrdered(path -> {
                    arguments.add("-p");
                    arguments.add(path);
                });
    }

    private void prepareVerbose(List<Object> arguments) {
        if (logger.isDebugEnabled()) {
            arguments.add("-v");
        }
    }
}
