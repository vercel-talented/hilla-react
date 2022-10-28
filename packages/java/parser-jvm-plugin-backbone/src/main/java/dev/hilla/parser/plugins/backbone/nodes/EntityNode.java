package dev.hilla.parser.plugins.backbone.nodes;

import javax.annotation.Nonnull;

import dev.hilla.parser.core.AbstractNode;
import dev.hilla.parser.models.ClassInfoModel;
import io.swagger.v3.oas.models.media.ObjectSchema;
import io.swagger.v3.oas.models.media.Schema;

public final class EntityNode extends AbstractNode<ClassInfoModel, Schema<?>> {
    private EntityNode(@Nonnull ClassInfoModel source,
            @Nonnull ObjectSchema target) {
        super(source, target);
    }

    @Nonnull
    static public EntityNode of(@Nonnull ClassInfoModel model) {
        return new EntityNode(model, new ObjectSchema());
    }
}
