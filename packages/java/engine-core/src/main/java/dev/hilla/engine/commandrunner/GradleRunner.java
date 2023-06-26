package dev.hilla.engine.commandrunner;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.util.List;
import java.util.Optional;

/**
 * Runs a Gradle command.
 */
public class GradleRunner implements CommandRunner {
    private static final Logger LOGGER = LoggerFactory
            .getLogger(GradleRunner.class);

    private final File projectDir;
    private final String[] args;

    /**
     * Creates a Gradle runner.
     *
     * @param projectDir
     *            the project directory
     * @param args
     */
    public GradleRunner(File projectDir, String... args) {
        this.projectDir = projectDir;
        this.args = args;
    }

    /**
     * Creates a Gradle runner for the given project directory.
     *
     * @param projectDir
     *            the project directory
     * @return a Gradle runner if the project directory contains a Gradle
     *         project, an empty optional otherwise
     */
    public static Optional<CommandRunner> forProject(File projectDir,
            String... args) {
        if (new File(projectDir, "build.gradle").exists()
                || new File(projectDir, "build.gradle.kts").exists()) {
            return Optional.of(new GradleRunner(projectDir, args));
        }

        return Optional.empty();
    }

    @Override
    public String[] arguments() {
        return args;
    }

    @Override
    public String[] testArguments() {
        return new String[] { "-v" };
    }

    @Override
    public Logger getLogger() {
        return LOGGER;
    }

    @Override
    public File currentDirectory() {
        return projectDir;
    }

    @Override
    public List<String> executables() {
        return IS_WINDOWS ? List.of(".\\gradlew.bat", "gradle.bat")
                : List.of("./gradlew", "gradle");
    }
}
