package dev.hilla.parser.plugins.backbone.nodes;

import javax.annotation.Nonnull;

import dev.hilla.parser.core.AbstractNode;
import dev.hilla.parser.models.ClassInfoModel;

public final class EndpointNonExposedNode
        extends AbstractNode<ClassInfoModel, Void> {
    private EndpointNonExposedNode(@Nonnull ClassInfoModel classInfo) {
        super(classInfo, null);
    }

    @Nonnull
    public static EndpointNonExposedNode of(@Nonnull ClassInfoModel classInfo) {
        return new EndpointNonExposedNode(classInfo);
    }
}
